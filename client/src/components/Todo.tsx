import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Props = {
  trigger: React.ReactElement
}
export const Todo = (props: Props) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={props.trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogDescription>
            This feature under construction
          </AlertDialogDescription>
          <AlertDialogDescription>Will be ready soon</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>OK</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
