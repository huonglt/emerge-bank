import { Avatar } from '@/components/ui/avatar'
import { ItemMedia } from '@/components/ui/item'

export const CardMedia = () => {
  return (
    <ItemMedia>
      <Avatar size="lg">
        <img src="./card.png" />
      </Avatar>
    </ItemMedia>
  )
}
