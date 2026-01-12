
import { useState } from 'react'
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/api'

export default function RegisterPage() {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    try {
      setLoading(true)
      await api.register(userName, email, password)
      setSuccess('Registration successful. You can now sign in.')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err: any) {
      console.log('Error in Registration', err);
      setError(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <Box className="main-container" display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
      <Card sx={{ minWidth: 420 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Create account</Typography>
          <Box component="form" onSubmit={onSubmit} className="flex-col gap-16">
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField label="Username" value={userName} onChange={e => setUserName(e.target.value)} required />
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <TextField label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <Button type="submit" variant="contained" disabled={loading}>Register</Button>
            <Typography variant="body2">Already have an account? <Link to="/login">Sign in</Link></Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
