import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import LoginForm from './components/LoginForm'

import logoSmImg from '@/assets/images/logo-sm.png'
import { Card, CardBody, Col } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Login' }

const Login = () => {
  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={logoSmImg} height={50} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Tydy Finance</h4>
            <p className="text-muted fw-medium mb-0">Sign in to your private operations workspace.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <LoginForm />
        </CardBody>
      </Card>
    </Col>
  )
}

export default Login
