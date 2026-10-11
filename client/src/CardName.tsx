import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
export const CardName = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <Item className="pr-0 pl-0">
          <ItemMedia>
            <Avatar size="lg">
              <img src="./card.png" />
            </Avatar>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Setting up virtual bank card</ItemTitle>
            <ItemDescription>
              We need a name for your virtual card
            </ItemDescription>
          </ItemContent>
        </Item>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input type="text" required />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}
