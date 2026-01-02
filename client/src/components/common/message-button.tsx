import { MailCheckIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const MessageButton = () => {
    return (
        <Button variant='outline' size='icon' className='relative h-8 w-8 sm:h-9 sm:w-9'>
            <MailCheckIcon className="h-4 w-4" />
            <span className='sr-only'>Messages</span>
            <Badge variant='destructive' className='absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 h-4 sm:h-5 min-w-4 sm:min-w-5 rounded-full px-1 text-[10px] sm:text-xs tabular-nums flex items-center justify-center'>
                8
            </Badge>
        </Button>
    )
}

export default MessageButton
