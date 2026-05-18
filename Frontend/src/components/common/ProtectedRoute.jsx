import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { toast } from 'react-toastify'

function ProtectedRoute({ children, role }) {
    const { currentUser } = useAuth()
    const [shouldRedirect, setShouldRedirect] = React.useState(false)
    const [redirectPath, setRedirectPath] = React.useState('')

    React.useEffect(() => {
        if (!currentUser) {
            toast.error('Login required')
            setShouldRedirect(true)
            setRedirectPath('/login')
        } else if (role) {
            const allowedRoles = Array.isArray(role) ? role : [role]

            if (!allowedRoles.includes(currentUser.role)) {
                toast.error('Unauthorized')
                setShouldRedirect(true)
                setRedirectPath('/unauthorized')
            }
        }
    }, [currentUser, role])

    if (shouldRedirect) {
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
