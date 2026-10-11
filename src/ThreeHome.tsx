import BlueprintEditor from './BlueprintEditor'

interface ThreeHomeProps {
  wallColor?: string
  floorColor?: string
  furniture?: string[]
  className?: string
  plan?: 'home1' | 'home2' | 'home3'
}

export default function ThreeHome({ plan }: ThreeHomeProps) {
  return <BlueprintEditor plan={plan} />
}
