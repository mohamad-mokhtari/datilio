import React, { useEffect, useState } from 'react'
import { Button, Card, Spinner, Table, Alert, Input } from '@/components/ui'
import MLService, { MLModel } from '@/services/MLService'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCcw } from 'lucide-react'

const { Tr, Th, Td, THead, TBody } = Table

const MLModelsPage: React.FC = () => {
  const navigate = useNavigate()
  const [models, setModels] = useState<MLModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await MLService.listModels()
      setModels(res.models || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  const filtered = models.filter(m =>
    m.model_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.algorithm || '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Machine Learning Models</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="twoTone" icon={<RefreshCcw />} onClick={loadModels}>Refresh</Button>
          <Button size="sm" icon={<Plus />} onClick={() => navigate('/ml-models/create')}>Create Model</Button>
        </div>
      </div>

      <Card>
        <div className="p-4 flex items-center gap-3">
          <Input placeholder="Search by name or algorithm..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center"><Spinner size="lg" /></div>
        ) : error ? (
          <div className="p-4"><Alert type="danger" showIcon>{error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Algorithm</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {filtered.map(model => (
                  <Tr key={model.id}>
                    <Td className="font-medium">{model.model_name}</Td>
                    <Td>{model.algorithm}</Td>
                    <Td className="capitalize">{model.model_type}</Td>
                    <Td className="capitalize">{model.status}</Td>
                    <Td>{new Date(model.created_at).toLocaleString()}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button size="sm" variant="twoTone" onClick={() => navigate(`/ml-models/${model.id}`)}>Details</Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {filtered.length === 0 && (
                  <Tr>
                    <Td colSpan={6}>
                      <div className="text-center py-8 text-gray-500">No models found</div>
                    </Td>
                  </Tr>
                )}
              </TBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default MLModelsPage


