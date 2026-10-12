import { ProfileMenu } from './ProfileMenu'

export const Header = () => {
  return (
    <div className="header flex w-full flex-row justify-between">
      <div className="typeset typeset-header">Digital bank</div>
      <ProfileMenu />
    </div>
  )
}
