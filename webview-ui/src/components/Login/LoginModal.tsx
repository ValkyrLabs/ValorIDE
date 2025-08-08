import React from "react"
import { CloseButton, Modal } from "react-bootstrap"
import Form from "./form"
import "./index.css"

interface LoginModalProps {
	visible: boolean
	toggle: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, toggle }) => {
	return (
		<Modal show={true}>
			<Modal.Header>
				Sign into your Valkyr Labs user account
				<CloseButton onClick={() => toggle()} />
			</Modal.Header>

			<Modal.Body>
				<Form />
			</Modal.Body>
		</Modal>
	)
}

export default LoginModal
