import re
import pandas as pd

from app.services.data_service import DataService

class FilterWorker():

    def __init__(self, pseudo_query, user_id, file_id, db, offset=0, limit=100):
            self.pseudo_query = pseudo_query
            self.user_id = user_id
            self.file_id = file_id
            self.db = db
            self.offset = offset
            self.limit = limit
            self.df = pd.DataFrame
            self.df_column_type = {}
            self._user_list_error = None

    
    def parse_in_opt_value(self, input_string: str):
        if (input_string.startswith("[") and input_string.endswith("]")):
            # Remove parentheses and split the string into a list of elements
            elements = [elem.strip() for elem in input_string[1:-1].split(",")]
        else:
            elements = [elem.strip() for elem in input_string.split(",")]
        # Wrap each element with single quotes
        wrapped_elements = [
            (
                f"{element.strip()}"
                if element.startswith("'")
                or element.startswith('"')
                and element.endswith("'")
                or element.endswith('"')
                else f"'{element.strip()}'"
            )
            for element in elements
        ]
        # Join the wrapped elements to form a new string
        result_string = f"({', '.join(wrapped_elements)})"
        return result_string


    def cast_value_by_type(self, value, column_type):
        """
        Cast the value based on the column type to ensure proper comparison
        Supports: string, integer, float, datetime, date, time, boolean, unknown
        """
        try:
            if column_type == 'integer':
                return int(value)
            elif column_type == 'float':
                return float(value)
            elif column_type == 'boolean':
                if str(value).lower() in ['true', '1', 'yes', 'on']:
                    return True
                elif str(value).lower() in ['false', '0', 'no', 'off']:
                    return False
                else:
                    return bool(value)
            elif column_type == 'datetime':
                # For datetime, keep as string for pandas comparison
                return f"'{value}'"
            elif column_type == 'date':
                # For date-only values, keep as string
                # Frontend should send in ISO format: YYYY-MM-DD
                return f"'{value}'"
            elif column_type == 'time':
                # For time-only values, keep as string
                # Frontend should send in format: HH:MM:SS or HH:MM
                return f"'{value}'"
            elif column_type == 'unknown':
                # Treat unknown types as strings
                return f"'{value}'"
            else:  # string
                return f"'{value}'"
        except (ValueError, TypeError):
            # If casting fails, treat as string
            return f"'{value}'"

    def parse_in_opt_value_with_type_casting(self, input_string: str, column_type: str):
        """
        Parse 'in' operator values with proper type casting
        """
        if (input_string.startswith("[") and input_string.endswith("]")):
            # Remove brackets and split the string into a list of elements
            elements = [elem.strip() for elem in input_string[1:-1].split(",")]
        else:
            elements = [elem.strip() for elem in input_string.split(",")]
        
        # Cast each element based on column type
        casted_elements = []
        for element in elements:
            # Remove quotes if present
            clean_element = element.strip().strip("'").strip('"')
            casted_value = self.cast_value_by_type(clean_element, column_type)
            casted_elements.append(str(casted_value))
        
        # Join the casted elements
        result_string = f"({', '.join(casted_elements)})"
        return result_string

    async def parse_user_list_values(self, list_name: str, column_type: str):
        """
        Parse user list values with proper type casting
        """
        try:
            # Get user list items from database
            list_items = await DataService.get_user_list_items(
                user_id=self.user_id, 
                list_name=list_name, 
                db=self.db
            )
            
            if not list_items:
                # If list is empty, return empty tuple
                return "()"
            
            # Cast each item based on column type
            casted_elements = []
            for item in list_items:
                casted_value = self.cast_value_by_type(item, column_type)
                casted_elements.append(str(casted_value))
            
            # Join the casted elements
            result_string = f"({', '.join(casted_elements)})"
            return result_string
            
        except Exception as e:
            # If there's an error (like list not found), raise it
            raise e

    def parse_between_values(self, input_string: str, column_type: str):
        """
        Parse 'between' operator values (e.g., "12,14" or "56, 267")
        """
        # Split by comma and clean values
        values = [val.strip() for val in input_string.split(",")]
        if len(values) != 2:
            raise ValueError("Between operator requires exactly 2 values separated by comma")
        
        # Cast both values based on column type
        casted_values = []
        for value in values:
            clean_value = value.strip().strip("'").strip('"')
            casted_value = self.cast_value_by_type(clean_value, column_type)
            casted_values.append(casted_value)
        
        return casted_values[0], casted_values[1]

    async def combination_sql_after_where(self, columns, operators, values, conjunctions):
        df_type_infer, self.df_column_type = await DataService.get_columns_type(user_id= self.user_id, file_id= self.file_id, db= self.db)
        expression_parts = {}
        for col, op, val in zip(columns, operators, values):
            column_name = col[0]
            column_type = self.df_column_type.get(column_name, 'string')
            operator = op[0].strip()
            
            # ---------> "in" and "not in" / "notIn" operators Analysis
            if operator in {"in", "not in", "notIn"}:
                val[0] = self.parse_in_opt_value_with_type_casting(val[0], column_type)
                if operator == "in":
                    expression_parts[col[1]] = (f"(self.df['{column_name}'].isin({val[0]}))")
                elif operator in {"not in", "notIn"}:
                    expression_parts[col[1]] = (f"(~self.df['{column_name}'].isin({val[0]}))")
            
            # ---------> "inUserList" and "notInUserList" operators Analysis
            elif operator in {"inUserList", "notInUserList"}:
                try:
                    # The value should be a single list name (no quotes, no commas)
                    list_name = val[0].strip().strip("'").strip('"')
                    user_list_values = await self.parse_user_list_values(list_name, column_type)
                    
                    if operator == "inUserList":
                        expression_parts[col[1]] = (f"(self.df['{column_name}'].isin({user_list_values}))")
                    elif operator == "notInUserList":
                        expression_parts[col[1]] = (f"(~self.df['{column_name}'].isin({user_list_values}))")
                        
                except Exception as e:
                    # If there's an error (like list not found), we need to handle it
                    # For now, we'll create an expression that will always be false
                    if operator == "inUserList":
                        expression_parts[col[1]] = (f"(self.df['{column_name}'].isin([]))")
                    elif operator == "notInUserList":
                        expression_parts[col[1]] = (f"(~self.df['{column_name}'].isin([]))")
                    # Store the error to be raised later
                    self._user_list_error = str(e)
            
            # ---------> "between" and "notBetween" operators Analysis
            elif operator in {"between", "notBetween"}:
                try:
                    min_val, max_val = self.parse_between_values(val[0], column_type)
                    if operator == "between":
                        expression_parts[col[1]] = (f"((self.df['{column_name}'] >= {min_val}) & (self.df['{column_name}'] <= {max_val}))")
                    elif operator == "notBetween":
                        expression_parts[col[1]] = (f"((self.df['{column_name}'] < {min_val}) | (self.df['{column_name}'] > {max_val}))")
                except ValueError as e:
                    # If parsing fails, treat as string comparison
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] {operator} '{val[0]}')")
            
            # ---------> "null" and "notNull" operators Analysis
            elif operator in {"null", "notNull"}:
                if operator == "null":
                    expression_parts[col[1]] = (f"(self.df['{column_name}'].isnull())")
                elif operator == "notNull":
                    expression_parts[col[1]] = (f"(self.df['{column_name}'].notnull())")
            
            # ---------> Text operators Analysis (for string-like columns)
            elif operator in {"contains", "doesNotContain", "beginsWith", "endsWith"}:
                # These operators work on string-like types: string, date, time, datetime, unknown
                if column_type in {'string', 'date', 'time', 'datetime', 'unknown', 'object'}:
                    search_value = val[0].strip().strip("'").strip('"')
                    if operator == "contains":
                        expression_parts[col[1]] = (f"(self.df['{column_name}'].astype(str).str.contains('{search_value}', case=False, na=False))")
                    elif operator == "doesNotContain":
                        expression_parts[col[1]] = (f"(~self.df['{column_name}'].astype(str).str.contains('{search_value}', case=False, na=False))")
                    elif operator == "beginsWith":
                        expression_parts[col[1]] = (f"(self.df['{column_name}'].astype(str).str.startswith('{search_value}', na=False))")
                    elif operator == "endsWith":
                        expression_parts[col[1]] = (f"(self.df['{column_name}'].astype(str).str.endswith('{search_value}', na=False))")
                else:
                    # For numeric/boolean columns, these operators don't apply - treat as string comparison
                    casted_value = self.cast_value_by_type(val[0], column_type)
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] {operator} {casted_value})")
            
            # ---------> Equality operator Analysis
            elif operator in {"=", "=="}:
                casted_value = self.cast_value_by_type(val[0], column_type)
                if column_type in {'integer', 'float', 'boolean'}:
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] == {casted_value})")
                else:  # string, datetime, date, time, unknown
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] == {casted_value})")
            
            # ---------> Other operators Analysis (comparison operators)
            else:
                casted_value = self.cast_value_by_type(val[0], column_type)
                if column_type in {'integer', 'float', 'boolean'}:
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] {operator} {casted_value})")
                elif column_type in {'string', 'datetime', 'date', 'time', 'unknown'}:
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] {operator} {casted_value})")
                else:
                    # Default to string comparison for any other type
                    expression_parts[col[1]] = (f"(self.df['{column_name}'] {operator} '{val[0]}')")
        
        for conj in conjunctions:
            if conj[0].lower() == "and":
                conj[0] = "&"
            elif conj[0].lower() == "or":
                conj[0] = "|"
            expression_parts[conj[1]] = conj[0]
        
        # Sort the dictionary based on keys
        sorted_dict = dict(sorted(expression_parts.items()))
        # Trim values and join by space
        result_string = f'self.df[{" ".join(value.strip() for value in sorted_dict.values())}]'
        return result_string


    async def convert_psudo_after_where_to_python_code(self, expression):
        # Extract the columns name
        columns_name = [
            [match.group(1), match.start(), match.end()]
            for match in re.finditer(r"\#{([^}]+)}", expression, re.IGNORECASE)
        ]
        # Extract the comparison operators
        operators = [
            [match.group(), match.start(), match.end()]
            for match in re.finditer(
                r"!=|<=|>=|==|<|>|=| in | not\sin | notIn | inUserList | notInUserList | between | notBetween | contains | doesNotContain | beginsWith | endsWith | null | notNull | is ",
                expression,
                re.IGNORECASE,
            )
        ]
        # Extract the values
        values_pattern = re.compile(r"[^#]\{([^{}]+)\}", re.IGNORECASE)
        values = [
            [match.group(1), match.start(), match.end()]
            for match in values_pattern.finditer(expression)
        ]
        # Extract the logical operators
        conjunctions = [
            [match.group(), match.start(), match.end()]
            for match in re.finditer(
                r"\band\b|\bor\b|\(|\)", expression, re.IGNORECASE
            )
        ]
        python_code_snippet = await self.combination_sql_after_where(columns_name, operators, values, conjunctions)  
        return (columns_name, operators, values, conjunctions, python_code_snippet)


    async def execute_query(self):
        expression = self.pseudo_query['query']
        (self.columns_name, self.operators, self.values, self.conjunctions, self.python_code_snippet) = await self.convert_psudo_after_where_to_python_code(expression)
        
        # # Check if there was a user list error
        # if hasattr(self, '_user_list_error'):
        #     from fastapi import HTTPException
        #     raise HTTPException(status_code=404, detail=self._user_list_error)
        
        self.df = await DataService.get_data_as_dataframe(user_id= self.user_id, file_id= self.file_id, db= self.db)
        
        # Apply the filter to get all matching records
        filtered_df = eval(self.python_code_snippet)
        
        # Get total count of filtered records
        total_count = len(filtered_df)
        
        # Apply pagination
        paginated_df = filtered_df.iloc[self.offset:self.offset + self.limit]
        
        return {
            'data': paginated_df,
            'total_count': total_count,
            'has_more': (self.offset + self.limit) < total_count,
            'python_code_snippet': self.python_code_snippet
        }


    async def execute_query_2(self):
        self.df = await DataService.get_data_as_dataframe(user_id= self.user_id, file_id= self.file_id, db= self.db)
        
        # Apply the filter to get all matching records
        filtered_df = eval(self.pseudo_query['query'])
        
        # Get total count of filtered records
        total_count = len(filtered_df)
        
        # Apply pagination
        paginated_df = filtered_df.iloc[self.offset:self.offset + self.limit]
        
        return {
            'data': paginated_df,
            'total_count': total_count,
            'has_more': (self.offset + self.limit) < total_count,
        }
