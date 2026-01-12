
import { useState } from 'react'
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { api } from '../api/api'
import { setToken, getAuth } from '../auth/auth'

export default function LoginPage() {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation() as any


const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)
  try {
    const res = await api.login(userName, password)

    // ✅ Check res/token before using
    if (!res || !res.token) {
      setError('Login did not return a token. Please try again or contact admin.')
      return
    }

    setToken(res.token)

    const auth = getAuth()
    if (auth?.roles?.includes('Admin')) navigate('/admin/users')
    else navigate(location.state?.from?.pathname || '/tasks', { replace: true })
  } catch (err: any) {
    setError(err.message || 'Login failed')
  }
}


  return (
    <Box className="main-container" display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
      <Card sx={{ minWidth: 360 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Sign in</Typography>
          <Box component="form" onSubmit={onSubmit} className="flex-col gap-16">
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={userName} onChange={e => setUserName(e.target.value)} required />
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" variant="contained">Login</Button>
            <Typography variant="body2">Don't have an account? <Link to="/register">Create account</Link></Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
