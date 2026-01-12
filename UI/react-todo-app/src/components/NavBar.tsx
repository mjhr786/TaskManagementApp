
import { Button, ButtonGroup } from '@mui/material'
import { Link } from 'react-router-dom'
import { getAuth, hasRole } from '../auth/auth'

export default function NavBar() {
  const auth = getAuth()
  return (
    <ButtonGroup variant="text" color="inherit" sx={{ mr: 2 }}>
      {auth?.token && (
        <>
          <Button component={Link} to="/tasks">Tasks</Button>
          <Button component={Link} to="/reports">Reports</Button>
          {hasRole('Admin') && <Button component={Link} to="/admin/users">Users</Button>}
        </>
      )}
    </ButtonGroup>
  )
}
