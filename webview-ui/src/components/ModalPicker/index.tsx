import Modal from "react-bootstrap/Modal"
import CoolButton from "../CoolButton"
import "./index.css"
interface ModalPickerProps {
	title: string
	toggle: () => void
	showModal: boolean
}

const ModalPicker = ({ title, toggle, showModal }: ModalPickerProps) => {
	return (
		<Modal show={showModal} backdrop="static" keyboard={false}>
			<Modal.Header closeButton>
				<Modal.Title>{title}</Modal.Title>
			</Modal.Header>
			<Modal.Body>Select from the following items:</Modal.Body>
			<div className="grid-container{"></div>
			<Modal.Footer>
				<CoolButton
					variant="primary"
					onClick={() => {
						toggle()
					}}>
					Cancel
				</CoolButton>
				<CoolButton
					variant="secondary"
					onClick={() => {
						toggle()
					}}>
					Select
				</CoolButton>
			</Modal.Footer>
		</Modal>
	)
}

export default ModalPicker
