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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, setAccessToken, setCsrf } from '@/lib/api'

export function ProfileMenu() {
  const me = useMeQuery()
  const userName = me.data?.name

  const qc = useQueryClient()

  const logout = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSettled: () => {
      // wipe all user data
      setAccessToken('')
      setCsrf('')
      qc.setQueryData(['user'], null)
      qc.clear()
    },
  })

  const logoutHandler = () => logout.mutate()

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
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logoutHandler}>Log out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
