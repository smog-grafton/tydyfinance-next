import { redirect } from 'next/navigation'

const QuickExpenseCredentialPage = () => redirect('/quick-expense?access=invalid')

export default QuickExpenseCredentialPage
