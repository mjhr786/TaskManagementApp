
import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material'
export default function TimeLogForm({ open, onClose, onSave, error }: { open: boolean, onClose: () => void, onSave: (hours: number) => void, error?: string }) {
  const [hours, setHours] = useState<string>('1')
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Log Hours</DialogTitle>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <TextField label="Hours" type="number" inputProps={{ step: 0.25, min: 0.25, max: 24 }} value={hours} onChange={e => setHours(e.target.value)} required />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(parseFloat(hours))} disabled={!hours}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
