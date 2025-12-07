import ApiService2 from '@/services/ApiService2'

export interface TargetAnalysis {
  problem_type: string
  suggested_models: string[]
  feature_columns: string[]
  total_rows: number
}

export interface MLModel {
  id: string
  model_name: string
  model_type: string
  algorithm: string
  target_column: string | null
  training_rows: number
  test_rows: number
  performance_metrics: Record<string, number>
  status: string
  created_at: string
}

export interface TrainingResult {
  status: string
  model_id: string
  model_name: string
  performance_metrics?: Record<string, number>
  training_duration_seconds?: number
}

export interface TrainModelRequest {
  model_name: string
  algorithm: string
  target_column: string | null
  feature_columns?: string[] | null
  train_size?: number
  random_state?: number
  hyperparameters?: Record<string, any>
  description?: string
}

class MLService {
  static async analyzeTarget(fileId: string, targetColumn: string | null) {
    const res = await ApiService2.post<TargetAnalysis>(`/ml/analyze-target/${fileId}`, {
      target_column: targetColumn,
    })
    return res.data
  }

  static async trainModel(fileId: string, payload: TrainModelRequest) {
    const res = await ApiService2.post<TrainingResult>(`/ml/train/${fileId}`, payload)
    return res.data
  }

  static async listModels() {
    const res = await ApiService2.get<{ total: number; models: MLModel[] }>(`/ml/models`)
    return res.data
  }

  static async getModel(modelId: string) {
    const res = await ApiService2.get<MLModel>(`/ml/models/${modelId}`)
    return res.data
  }

  static async deleteModel(modelId: string) {
    const res = await ApiService2.delete(`/ml/models/${modelId}`)
    return res.data
  }

  static async downloadModel(modelId: string, modelName: string) {
    const res = await ApiService2.get<Blob>(`/ml/models/${modelId}/download`)
    const blob = res.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${modelName}.pkl`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  static async predict(modelId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await ApiService2.post(`/ml/models/${modelId}/predict`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  static async downloadPredictions(filename: string) {
    const res = await ApiService2.get<Blob>(`/ml/predictions/${filename}/download`)
    return res.data as Blob
  }

  static async getSupportedAlgorithms() {
    const res = await ApiService2.get(`/ml/supported-algorithms`)
    return res.data
  }
}

export default MLService


