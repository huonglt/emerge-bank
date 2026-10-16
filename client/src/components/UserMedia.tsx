import { Avatar } from '@/components/ui/avatar'
import { ItemMedia } from '@/components/ui/item'

export const UserMedia = () => {
  return (
    <ItemMedia>
      <Avatar size="sm">
        <img src="./user.svg" alt="user icon" />
      </Avatar>
    </ItemMedia>
  )
}
