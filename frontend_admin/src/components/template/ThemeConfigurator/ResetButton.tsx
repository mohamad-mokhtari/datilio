import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useThemeLocalStorage from '@/utils/hooks/useThemeLocalStorage'

const ResetButton = () => {
    const { resetToDefault } = useThemeLocalStorage()

    const handleReset = () => {
        // Reset all theme settings to default values and clear localStorage
        resetToDefault()

        // Show success notification
        toast.push(
            <Notification title="Reset Successful" type="success">
                All theme settings have been reset to default values
            </Notification>,
            {
                placement: 'top-center',
            }
        )
    }

    return (
        <Button 
            block 
            variant="default" 
            onClick={handleReset}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
            Reset to Default
        </Button>
    )
}

export default ResetButton
