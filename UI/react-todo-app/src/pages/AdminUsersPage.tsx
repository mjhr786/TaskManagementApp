
import { useEffect, useState } from 'react'
import { api } from '../api/api'
import { Alert, Box, Button, Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
export type User = { id: string, userName: string, email: string }
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const load = async () => { try { setLoading(true); const data = await api.getUsers(); setUsers(data) } catch (e:any) { setError(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const create = async () => { try { await api.createUser(userName, email); setUserName(''); setEmail(''); await load() } catch (e:any) { setError(e.message) } }
  const remove = async (id: string) => { if (!confirm('Delete user?')) return; try { await api.deleteUser(id); await load() } catch (e:any) { setError(e.message) } }
  return (
    <Box className="flex-col gap-16">
      <Card className="card">
        <CardContent>
          <Typography variant="h6">Manage Users</Typography>
          {error && <Alert sx={{ mt:2 }} severity="error">{error}</Alert>}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField size="small" label="Username" value={userName} onChange={e => setUserName(e.target.value)} />
            <TextField size="small" label="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <Button variant="contained" onClick={create} disabled={!userName || !email}>Add</Button>
          </Stack>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {loading ? <Typography>Loading...</Typography> : users.map(u => (
              <Card key={u.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography sx={{ minWidth: 280 }}>{u.userName} ({u.email})</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton color="error" onClick={() => remove(u.id)} title="Delete"><DeleteIcon /></IconButton>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && !loading && <Typography>No users found.</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
