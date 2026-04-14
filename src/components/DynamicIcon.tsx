import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface DynamicIconProps extends LucideProps {
  name: string
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as React.ComponentType<LucideProps> | undefined
  if (!Icon) return null
  return <Icon {...props} />
}
