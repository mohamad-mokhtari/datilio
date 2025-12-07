import React, { useEffect, useState } from 'react'
import { Card, Button, Input, Spinner, Alert, Table } from '@/components/ui'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react'
import MLService from '@/services/MLService'
import PreprocessingService, { PreprocessedFile, PreprocessedFileMetadata } from '@/services/PreprocessingService'

const { Tr, Th, Td, THead, TBody } = Table

type Step = 1 | 2 | 3 | 4

const CreateModelWizard: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const qp = new URLSearchParams(location.search)
  const initialFileId = qp.get('fileId') || ''

  const [step, setStep] = useState<Step>(1)
  const [fileId, setFileId] = useState(initialFileId)
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [preprocessedFiles, setPreprocessedFiles] = useState<PreprocessedFile[]>([])
  const [metadata, setMetadata] = useState<PreprocessedFileMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [modelName, setModelName] = useState('New Model')
  const [targetColumn, setTargetColumn] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [algorithm, setAlgorithm] = useState<string>('')
  const [trainSize, setTrainSize] = useState(80) // percent

  const next = () => setStep(prev => (prev < 4 ? ((prev + 1) as Step) : prev))
  const back = () => setStep(prev => (prev > 1 ? ((prev - 1) as Step) : prev))

  const loadPreprocessedFiles = async () => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await PreprocessingService.getMLReadyPreprocessedFiles()
      setPreprocessedFiles(res?.ml_ready_files || [])
    } catch (e: any) {
      setFilesError(e?.message || 'Failed to load ML-ready preprocessed files')
    } finally {
      setFilesLoading(false)
    }
  }

  useEffect(() => {
    loadPreprocessedFiles()
  }, [])

  const loadMetadata = async () => {
    if (!fileId) return
    setMetadataLoading(true)
    setMetadataError(null)
    try {
      const res = await PreprocessingService.getPreprocessedFileMetadata(fileId)
      console.log('Metadata loaded:', res)
      console.log('Column names:', res.column_names)
      console.log('Column names length:', res.column_names?.length)
      setMetadata(res)
    } catch (e: any) {
      console.error('Error loading metadata:', e)
      setMetadataError(e?.message || 'Failed to load file metadata')
    } finally {
      setMetadataLoading(false)
    }
  }

  useEffect(() => {
    if (step === 2 && fileId) {
      loadMetadata()
    }
  }, [step, fileId])

  const startAnalyze = async () => {
    if (!fileId) return
    setLoading(true)
    setError(null)
    try {
      const res = await MLService.analyzeTarget(fileId, targetColumn)
      setAnalysis(res)
      // Pre-select first suggested algorithm if exists
      if (res?.suggested_models?.length) {
        setAlgorithm(res.suggested_models[0])
      }
      setStep(3)
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze target')
    } finally {
      setLoading(false)
    }
  }

  const train = async () => {
    if (!fileId || !algorithm) return
    setLoading(true)
    setError(null)
    try {
      const res = await MLService.trainModel(fileId, {
        model_name: modelName,
        algorithm,
        target_column: targetColumn,
        train_size: trainSize / 100,
        random_state: 42,
      })
      if (res?.model_id) {
        setStep(4)
        // Navigate to details after a short delay
        setTimeout(() => navigate(`/ml-models/${res.model_id}`), 600)
      }
    } catch (e: any) {
      setError(e?.message || 'Training failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="plain" icon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button>
          <h1 className="text-xl font-semibold">Create Model</h1>
        </div>
      </div>

      <Card className="p-4">
        {error && (
          <div className="mb-3"><Alert type="danger" showIcon>{error}</Alert></div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Step 1 of 4: Select Preprocessed File</h2>
            {filesError && <Alert type="danger" showIcon>{filesError}</Alert>}
            {filesLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Select</Th>
                      <Th>File Name</Th>
                      <Th>Rows</Th>
                      <Th>Columns</Th>
                      <Th>Status</Th>
                      <Th>Processed</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {(preprocessedFiles || []).map((f) => (
                      <Tr key={f.id} className="cursor-pointer" onClick={() => setFileId(f.id)}>
                        <Td>
                          <input
                            type="radio"
                            name="selectedPreprocessedFile"
                            checked={fileId === f.id}
                            onChange={() => setFileId(f.id)}
                          />
                        </Td>
                        <Td className="font-medium">{f.file_name}</Td>
                        <Td>{f.rows_after ?? f.rows_before ?? 0}</Td>
                        <Td>{f.columns_after ?? f.columns_before ?? 0}</Td>
                        <Td>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ML-Ready
                          </span>
                        </Td>
                        <Td>{new Date((f.updated_at || f.created_at) as string).toLocaleString()}</Td>
                      </Tr>
                    ))}
                    {preprocessedFiles.length === 0 && (
                      <Tr>
                        <Td colSpan={6}>
                          <div className="py-6 text-center space-y-2">
                            <div className="text-gray-500 font-medium">No ML-ready preprocessed files found</div>
                            <div className="text-sm text-gray-400">
                              Preprocessed files must have all numeric columns to be used for ML training.
                            </div>
                            <div className="text-sm text-gray-400">
                              Go to <a href="/preprocessing" className="text-blue-500 hover:underline">Preprocessing</a> and apply encoding/vectorization to make your files ML-ready.
                            </div>
                          </div>
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={!fileId} icon={<ArrowRight />} onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Step 2 of 4: Analyze Target</h2>
            {metadataError && <Alert type="danger" showIcon>{metadataError}</Alert>}
            {metadataLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : metadata ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1 font-medium">Target Column (what to predict):</label>
                  {metadata.column_names && metadata.column_names.length > 0 ? (
                    <>
                      <select
                        value={targetColumn || ''}
                        onChange={(e) => setTargetColumn(e.target.value && e.target.value !== '' ? e.target.value : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">None (Clustering)</option>
                        {metadata.column_names.map((col: string) => (
                          <option key={col} value={col}>
                            {col}
                            {metadata.numeric_columns?.includes(col) && ' (Numeric)'}
                            {metadata.categorical_columns?.includes(col) && ' (Categorical)'}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        {metadata.column_names.length} columns available
                        {metadata.numeric_columns?.length && ` • ${metadata.numeric_columns.length} numeric`}
                        {metadata.categorical_columns?.length && ` • ${metadata.categorical_columns.length} categorical`}
                      </p>
                    </>
                  ) : (
                    <Alert type="warning" showIcon>
                      No columns found in metadata. Column names: {JSON.stringify(metadata.column_names)}
                    </Alert>
                  )}
                </div>
              </div>
            ) : (
              <Alert type="warning" showIcon>Please select a file in Step 1</Alert>
            )}
            <div className="flex justify-between">
              <Button variant="twoTone" onClick={back}>Back</Button>
              <Button icon={<ArrowRight />} loading={loading} disabled={metadataLoading || !metadata} onClick={startAnalyze}>Analyze</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Step 3 of 4: Configure Model</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Model Name</label>
                <Input value={modelName} onChange={e => setModelName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select algorithm...</option>
                  {(analysis?.suggested_models || []).map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Train Size (%)</label>
                <Input type="number" min={50} max={95} value={trainSize} onChange={e => setTrainSize(parseInt(e.target.value) || 80)} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="twoTone" onClick={back}>Back</Button>
              <Button icon={<Check />} loading={loading} onClick={train}>Train Model</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center py-10">
            <Spinner />
            <div>Training complete! Redirecting to model details...</div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default CreateModelWizard


