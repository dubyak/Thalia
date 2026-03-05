import { TesterProvider } from '@/contexts/TesterContext'
import { FlowProvider } from '@/contexts/FlowContext'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <TesterProvider>
      <FlowProvider>
        {children}
      </FlowProvider>
    </TesterProvider>
  )
}
