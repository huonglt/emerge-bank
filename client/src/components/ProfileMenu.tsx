import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '../lib/utils'
import { useMeQuery } from '@/hooks/useMeQuery'
import { useLogout } from '@/hooks/useLogout'
import { UserIcon } from 'lucide-react'

export const ProfileMenu = () => {
  const me = useMeQuery()
  const userName = me.data?.name

  const { logout } = useLogout()

  if (!userName) {
    return null
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className={'buttonProfile'}>
            <Avatar className={'buttonProfile'}>
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-40" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>

          <DropdownMenuItem onClick={logout}>
            <UserIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
