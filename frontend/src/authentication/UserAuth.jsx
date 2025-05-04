import React, { useContext } from 'react'
import { useEffect, useState } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate } from 'react-router-dom'

const UserAuth = ({children}) => {

    const [isloading, setisLoading] = useState(true);
    const {user} = useContext(UserContext);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {

        if(user){
            setisLoading(false);
        }
        
        if(!token){
            navigate("/login")
        }
        
        if(!user){
            navigate("/login");
        }
    }, [])
    

    if(isloading){
        <div>Loading...</div>
    }
  return (
    <>
        {children}
    </>
  )
}

export default UserAuth
