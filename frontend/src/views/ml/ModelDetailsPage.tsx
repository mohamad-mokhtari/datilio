import React, { useEffect, useState } from 'react'
import { Card, Button, Spinner, Alert, Table } from '@/components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import MLService, { MLModel } from '@/services/MLService'
import { ArrowLeft, Trash2, Download } from 'lucide-react'

const { Tr, Th, Td, THead, TBody } = Table

const ModelDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { modelId = '' } = useParams<{ modelId: string }>()
  const [model, setModel] = useState<MLModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await MLService.getModel(modelId)
      setModel(res)
    } catch (e: any) {
      setError(e?.message || 'Failed to load model')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (modelId) load()
  }, [modelId])

  const handleDelete = async () => {
    if (!model) return
    if (!confirm('Delete this model?')) return
    await MLService.deleteModel(model.id)
    navigate('/ml-models')
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="plain" icon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button>
          <h1 className="text-xl font-semibold">Model Details</h1>
        </div>
        {model && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="twoTone" icon={<Download />} onClick={() => MLService.downloadModel(model.id, model.model_name)}>Download</Button>
            <Button size="sm" variant="twoTone" color="red" icon={<Trash2 />} onClick={handleDelete}>Delete</Button>
          </div>
        )}
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="py-10 flex justify-center"><Spinner size="lg" /></div>
        ) : error ? (
          <Alert type="danger" showIcon>{error}</Alert>
        ) : model ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-2">Overview</h2>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Name:</span> {model.model_name}</div>
                <div><span className="font-medium">Type:</span> {model.model_type}</div>
                <div><span className="font-medium">Algorithm:</span> {model.algorithm}</div>
                <div><span className="font-medium">Status:</span> {model.status}</div>
                <div><span className="font-medium">Created:</span> {new Date(model.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium mb-2">Performance Metrics</h2>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Metric</Th>
                      <Th>Value</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {Object.entries(model.performance_metrics || {}).map(([k, v]) => (
                      <Tr key={k}>
                        <Td className="capitalize">{k.replace(/_/g, ' ')}</Td>
                        <Td>{typeof v === 'number' ? v.toFixed(4) : String(v)}</Td>
                      </Tr>
                    ))}
                    {(!model.performance_metrics || Object.keys(model.performance_metrics).length === 0) && (
                      <Tr><Td colSpan={2}>No metrics available</Td></Tr>
                    )}
                  </TBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default ModelDetailsPage


