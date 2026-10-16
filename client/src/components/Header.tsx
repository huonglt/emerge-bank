import { Landmark } from 'lucide-react'
import { ProfileMenu } from '@/components/ProfileMenu'

export const Header = () => {
  return (
    <div className="header flex w-full flex-row justify-between">
      <span className="flex items-center gap-2 font-semibold">
        <Landmark className="size-5" /> Digital Bank
      </span>
      <ProfileMenu />
    </div>
  )
}
