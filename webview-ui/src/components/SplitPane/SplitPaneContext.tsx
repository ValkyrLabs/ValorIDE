import { createContext } from "react"

interface SplitPaneContextProps {
	clientHeight: number

	setClientHeight: React.Dispatch<React.SetStateAction<number | null>>

	clientWidth: number

	setClientWidth: React.Dispatch<React.SetStateAction<number | null>>

	onMouseHoldDown: (e: React.MouseEvent) => void
}

const SplitPaneContext = createContext<SplitPaneContextProps | undefined>(undefined)

export default SplitPaneContext
