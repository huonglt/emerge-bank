import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Dialog,
} from './ui/dialog'

type Props = {
  trigger: React.ReactElement
}
export const Todo = (props: Props) => {
  return (
    <Dialog>
      <DialogTrigger render={props.trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Todo</DialogTitle>
          <DialogDescription>This feature will be ready soon</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
