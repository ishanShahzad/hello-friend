import React, { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

function ProtectedRoute({ children, role }) {
    const {
        currentUser
    } = useAuth()
    // console.log(currentUser);

    if (!currentUser) {
        toast.error('Login required')
        return <Navigate to={'/auth'} replace />
    }

    if (role && currentUser.role !== role) {
        toast.error('Unauthorized')
        return <Navigate to={'/unauthorized'} replace />
    }

    return children
}

export default ProtectedRoute