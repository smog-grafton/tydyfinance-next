'use client'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import useSignIn from '../useSignIn'
import { Col } from 'react-bootstrap'

const LoginForm = () => {
  const { loading, login, control, register } = useSignIn()

  return (
    <form onSubmit={login} className="my-4">
      <TextFormInput
        control={control}
        name="email"
        label="Email address"
        containerClassName="form-group mb-2"
        placeholder="Enter your email address"
        autoComplete="email"
      />

      <PasswordFormInput
        control={control}
        name="password"
        label="Password"
        containerClassName="form-group"
        placeholder="Enter your password"
        autoComplete="current-password"
      />

      <div className="form-group row mt-3">
        <Col sm={6}>
          <div className="form-check form-switch form-switch-primary">
            <input className="form-check-input" type="checkbox" id="remember" {...register('remember')} />
            <label className="form-check-label" htmlFor="remember">
              Remember me
            </label>
          </div>
        </Col>
      </div>
      <div className="form-group mb-0 row">
        <Col xs={12}>
          <div className="d-grid mt-3">
            <button className="btn btn-primary flex-centered" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Log in'} {!loading && <IconifyIcon icon="fa6-solid:right-to-bracket" className="ms-1" />}
            </button>
          </div>
        </Col>
      </div>
    </form>
  )
}

export default LoginForm
