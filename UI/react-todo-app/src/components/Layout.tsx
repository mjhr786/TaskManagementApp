
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import NavBar from './NavBar'
import { getAuth, logout } from '../auth/auth'

export default function Layout() {
  const navigate = useNavigate()
  const auth = getAuth()
  const handleLogout = () => { logout(); navigate('/login') }
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Daily Tasks</Typography>
          <NavBar />
          {auth?.token ? (
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">Login</Button>
              <Button color="inherit" component={Link} to="/register">Register</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box className="main-container">
        <Outlet />
      </Box>
    </>
  )
}
