import React, { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

function ProtectedRoute({ children, role }) {
    const { currentUser } = useAuth()
    const [shouldRedirect, setShouldRedirect] = React.useState(false)
    const [redirectPath, setRedirectPath] = React.useState('')

    React.useEffect(() => {
        console.log('=== PROTECTED ROUTE DEBUG ===');
        console.log('Current user:', currentUser);
        console.log('Required role:', role);
        console.log('User role:', currentUser?.role);
        
        if (!currentUser) {
            console.log('No user - redirecting to login');
            toast.error('Login required')
            setShouldRedirect(true)
            setRedirectPath('/login')
        } else if (role) {
            const allowedRoles = Array.isArray(role) ? role : [role]
            console.log('Allowed roles:', allowedRoles);
            console.log('Is allowed?', allowedRoles.includes(currentUser.role));
            
            if (!allowedRoles.includes(currentUser.role)) {
                console.log('User role not allowed - redirecting to unauthorized');
                toast.error('Unauthorized')
                setShouldRedirect(true)
                setRedirectPath('/unauthorized')
            } else {
                console.log('Access granted!');
            }
        }
    }, [currentUser, role])

    if (shouldRedirect) {
        console.log('Redirecting to:', redirectPath);
        return <Navigate to={redirectPath} replace />
    }

    if (!currentUser) {
        return null
    }

    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role]
        if (!allowedRoles.includes(currentUser.role)) {
            return null
        }
    }

    return children
}

export default ProtectedRoute