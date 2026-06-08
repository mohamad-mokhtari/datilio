/**
 * User-friendly messages for synthetic data task errors (toasts, failed tasks table).
 */

const FILENAME_FROM_DB_ERROR = /file_name\)=\([^,]+,\s*([^)]+)\)/i

function extractFilename(raw: string): string | null {
  const match = raw.match(FILENAME_FROM_DB_ERROR)
  return match?.[1]?.trim() ?? null
}

export function formatSyntheticTaskError(
  raw: string | undefined | null
): string {
  if (!raw?.trim()) {
    return 'Data generation failed. Please try again.'
  }

  const lower = raw.toLowerCase()

  if (
    lower.includes('uq_user_file_name') ||
    (lower.includes('duplicate key') && lower.includes('file_name')) ||
    (lower.includes('uniqueviolation') && lower.includes('file_name'))
  ) {
    const filename = extractFilename(raw) ?? 'this name'
    return `A file named "${filename}" already exists in your account. Please choose a different file name and try again.`
  }

  if (lower.includes('storage limit exceeded')) {
    return 'You have reached your storage limit. Delete some files or upgrade your plan, then try again.'
  }

  if (
    lower.includes('error 10061') ||
    lower.includes('connection refused') ||
    lower.includes('failed to queue') ||
    lower.includes('redis')
  ) {
    return 'Our background processing system is temporarily unavailable. Please try again in a few minutes.'
  }

  if (lower.includes('timeout') || lower.includes('no workers')) {
    return 'The task could not be processed in time because no workers were available. Please try again later.'
  }

  if (lower.includes('quota') || lower.includes('limit exceeded')) {
    return 'You have reached your synthetic data row limit for this month. Please upgrade your plan or try again next month.'
  }

  if (
    lower.includes('sqlalchemy') ||
    lower.includes('psycopg2') ||
    lower.includes('integrityerror') ||
    lower.includes('insert into') ||
    lower.includes('traceback')
  ) {
    return 'Something went wrong while saving your generated file. Please try again with a different file name or contact support if the issue continues.'
  }

  if (raw.length > 200 || (raw.includes('[') && raw.includes(']'))) {
    return 'Data generation failed due to an unexpected error. Please review your settings and try again.'
  }

  return raw
}

export function getSyntheticFailureLabel(failureType?: string): string {
  switch (failureType) {
    case 'duplicate_filename':
      return 'Duplicate file name'
    case 'storage_limit':
      return 'Storage limit reached'
    case 'service_unavailable':
      return 'Service unavailable'
    case 'worker_timeout':
      return 'Worker timeout'
    default:
      return 'Processing error'
  }
}
