import Link from 'next/link'
import Image from 'next/image'

import logoSm from '@/assets/images/logo-sm.png'

const LogoBox = () => {
  return (
    <Link href="/" className="logo">
      <span>
        <Image src={logoSm} alt="logo-small" width={38} height={38} className="logo-sm" />
      </span>
      <span className="logo-lg fw-bold fs-5 text-body text-nowrap">Tydy Finance</span>
    </Link>
  )
}

export default LogoBox
