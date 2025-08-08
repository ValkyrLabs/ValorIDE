import React, { useState, useEffect } from 'react'
import { VSCodeButton, VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react'
import { useExtensionState } from '@/context/ExtensionStateContext'
import './ApplicationProgress.css'

interface ProgressStep {
	id: string
	title: string
	description: string
	status: 'pending' | 'active' | 'completed' | 'error'
	details?: string
}

interface ApplicationProgressProps {
	applicationId?: string
	applicationName?: string
	onClose?: () => void
}

const ApplicationProgress: React.FC<ApplicationProgressProps> = ({
	applicationId,
	applicationName,
	onClose
}) => {
	const { valorideMessages } = useExtensionState()
	const [steps, setSteps] = useState<ProgressStep[]>([
		{
			id: 'receiving',
			title: 'Receiving Application',
			description: 'Downloading application payload...',
			status: 'pending'
		},
		{
			id: 'processing',
			title: 'Processing Data',
			description: 'Analyzing application structure...',
			status: 'pending'
		},
		{
			id: 'extracting',
			title: 'Extracting Files',
			description: 'Creating project structure...',
			status: 'pending'
		},
		{
			id: 'finalizing',
			title: 'Finalizing Setup',
			description: 'Preparing development environment...',
			status: 'pending'
		}
	])

	const [currentStep, setCurrentStep] = useState<string>('receiving')
	const [isComplete, setIsComplete] = useState(false)
	const [hasError, setHasError] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [resultDetails, setResultDetails] = useState<{
		filePath?: string
		extractedPath?: string
		readmePath?: string
	}>({})

	useEffect(() => {
		// Listen for streamToThorapiResult messages
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			if (message.type === 'streamToThorapiResult' && message.streamToThorapiResult) {
				const result = message.streamToThorapiResult
				
				if (result.applicationId === applicationId) {
					updateProgress(result)
				}
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [applicationId])

	const updateProgress = (result: any) => {
		const { step, success, error, message, filePath, extractedPath, readmePath } = result

		if (error) {
			setHasError(true)
			setErrorMessage(error)
			setSteps(prev => prev.map(s => 
				s.id === step ? { ...s, status: 'error', details: error } : s
			))
			return
		}

		if (success && step === 'completed') {
			setIsComplete(true)
			setResultDetails({ filePath, extractedPath, readmePath })
			setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })))
			return
		}

		// Update current step
		setCurrentStep(step)
		setSteps(prev => prev.map(s => {
			if (s.id === step) {
				return { ...s, status: 'active', details: message }
			} else if (getStepIndex(s.id) < getStepIndex(step)) {
				return { ...s, status: 'completed' }
			}
			return s
		}))
	}

	const getStepIndex = (stepId: string): number => {
		const stepOrder = ['receiving', 'processing', 'extracting', 'finalizing', 'completed']
		return stepOrder.indexOf(stepId)
	}

	const getStepIcon = (status: ProgressStep['status']) => {
		switch (status) {
			case 'completed':
				return '✅'
			case 'active':
				return <VSCodeProgressRing style={{ width: '16px', height: '16px' }} />
			case 'error':
				return '❌'
			default:
				return '⏳'
		}
	}

	const handleOpenFolder = () => {
		if (resultDetails.extractedPath) {
			// Send message to extension to open the folder
			window.postMessage({
				type: 'openFolder',
				path: resultDetails.extractedPath
			}, '*')
		}
	}

	const handleOpenReadme = () => {
		if (resultDetails.readmePath) {
			// Send message to extension to open the README
			window.postMessage({
				type: 'openFile',
				path: resultDetails.readmePath
			}, '*')
		}
	}

	return (
		<div className="application-progress">
			<div className="application-progress-header">
				<h2>Application Generation</h2>
				{applicationId && (
					<div className="application-id">
						<span>{applicationName}</span>
						<span>ID: {applicationId}</span>
					</div>
				)}
			</div>

			<div className="application-progress-content">
				{hasError ? (
					<div className="application-progress-error">
						<div className="error-icon">❌</div>
						<h3>Generation Failed</h3>
						<p>{errorMessage}</p>
						<VSCodeButton onClick={onClose}>Close</VSCodeButton>
					</div>
				) : isComplete ? (
					<div className="application-progress-success">
						<div className="success-icon">🎉</div>
						<h3>Application Generated Successfully!</h3>
						<p>Your application has been created and is ready for development.</p>
						
						<div className="result-actions">
							{resultDetails.extractedPath && (
								<VSCodeButton appearance="primary" onClick={handleOpenFolder}>
									Open Project Folder
								</VSCodeButton>
							)}
							{resultDetails.readmePath && (
								<VSCodeButton onClick={handleOpenReadme}>
									View Documentation
								</VSCodeButton>
							)}
							<VSCodeButton appearance="secondary" onClick={onClose}>
								Close
							</VSCodeButton>
						</div>

						{resultDetails.extractedPath && (
							<div className="result-details">
								<h4>Project Details:</h4>
								<ul>
									<li><strong>Location:</strong> {resultDetails.extractedPath}</li>
									{resultDetails.readmePath && (
										<li><strong>Documentation:</strong> {resultDetails.readmePath}</li>
									)}
								</ul>
							</div>
						)}
					</div>
				) : (
					<div className="application-progress-steps">
						{steps.map((step, index) => (
							<div 
								key={step.id} 
								className={`progress-step ${step.status}`}
							>
								<div className="step-icon">
									{getStepIcon(step.status)}
								</div>
								<div className="step-content">
									<h4>{step.title}</h4>
									<p>{step.details || step.description}</p>
								</div>
								{index < steps.length - 1 && (
									<div className={`step-connector ${step.status === 'completed' ? 'completed' : ''}`} />
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{!isComplete && !hasError && (
				<div className="application-progress-footer">
					<p>Please wait while your application is being generated...</p>
				</div>
			)}
		</div>
	)
}

export default ApplicationProgress
