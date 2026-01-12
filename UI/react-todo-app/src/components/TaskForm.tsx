
import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material'

export default function TaskForm({
  open,
  onClose,
  initial,
  onSave,
  error
}: {
  open: boolean,
  onClose: () => void,
  initial?: { title: string, description?: string, startDate: string, endDate: string },
  onSave: (payload: { title: string, description?: string, startDate: string, endDate: string }) => void,
  error?: string
}) {
  // Local state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0,10))

  // When dialog opens (or initial changes), load initial; when closing, clear the fields
  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title || '')
        setDescription(initial.description || '')
        setStartDate(initial.startDate || new Date().toISOString().slice(0,10))
        setEndDate(initial.endDate || new Date().toISOString().slice(0,10))
      } else {
        // fresh form
        setTitle('')
        setDescription('')
        const today = new Date().toISOString().slice(0,10)
        setStartDate(today)
        setEndDate(today)
      }
    }
  }, [open, initial])

  // Clear state on dialog exit (backdrop click or programmatic close)
  const handleExited = () => {
    setTitle('')
    setDescription('')
    const today = new Date().toISOString().slice(0,10)
    setStartDate(today)
    setEndDate(today)
  }

  return (
    <Dialog open={open} onClose={onClose} onExited={handleExited} fullWidth>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DialogTitle>{initial ? 'Update Task' : 'Add Task'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline rows={3} />
        <TextField label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
        <TextField label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave({ title, description, startDate, endDate })}
          disabled={!title || !startDate || !endDate}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
