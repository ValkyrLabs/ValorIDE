import {
  ErrorMessage,
  Field,
  Formik,
  FormikHelpers,
  FormikValues,
} from "formik";
import React from "react";
import { Form as BSForm, Col, Nav, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { useAddPrincipalMutation } from "@thor/redux/services/PrincipalService";
import { Login, Principal } from "@thor/model";
import CoolButton from "@valkyr/component-library/CoolButton";
import "./index.css";
import { storeJwtToken, writeStoredPrincipal } from "@/utils/accessControl";

const validationSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, "First Name must be minimum 2 characters")
    .max(100, "Name must not be more than 100 characters")
    .required("First Name is required"),
  lastName: Yup.string()
    .min(2, "Last name must be minimum 2 characters")
    .max(100, "Name must not be more than 100 characters")
    .required("Last Name is required"),
  username: Yup.string()
    .min(5, "User Name must be minimum 5 characters")
    .max(20, "Name must not be more than 100 characters")
    .required("User Name is required"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("A valid email address is required"),
  acceptedTos: Yup.boolean()
    .required("The terms of service must be accepted to continue.")
    .oneOf([true], "The terms of service must be accepted to continue."),
  password: Yup.string()
    .matches(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/,
      "Password must contain a lowercase character, an uppercase character, and a number",
    )
    .required()
    .min(8, "Password must be at least 8 characters"),
});

const BetaSignup: React.FC = () => {
  const [addPrincipal, addPrincipalResult] = useAddPrincipalMutation();
  const navigate = useNavigate();

  // If we got an error, and the mutation is in "rejected" status,
  // principalExists is basically a quick way to check an error was thrown
  const principalExists =
    (addPrincipalResult.error as any)?.status === 400 &&
    addPrincipalResult.status === "rejected";

  // alert(JSON.stringify(addPrincipalResult));
  const signupSuccess = addPrincipalResult.status === "fulfilled";

  let existingPrincipalName = null;
  if (principalExists) {
    // This means the server rejected the request
    // so store the attempted username in a local variable
    existingPrincipalName = addPrincipalResult.originalArgs.username;
  }

  const initialValues: Login = {
    token: "",
    username: "",
    password: "",
  };

  const handleSubmit = async (
    values: FormikValues,
    { setSubmitting }: FormikHelpers<Principal>,
  ) => {
    setSubmitting(true);

    try {
      // Attempt to create the Principal
      const response = await addPrincipal(values).unwrap();

      // If the response contains auth, persist it for downstream flows
      const respAny: any = response as any;
      if (respAny?.token) {
        storeJwtToken(respAny.token, "signup-beta");
      }

      if (respAny?.authenticatedPrincipal) {
        let principalPayload = respAny.authenticatedPrincipal;
        if (typeof principalPayload === "string") {
          try {
            principalPayload = JSON.parse(principalPayload);
          } catch {
            principalPayload = undefined;
          }
        }
        if (principalPayload) {
          writeStoredPrincipal(principalPayload as any);
        }
      }

      navigate("/login");
    } catch (error) {
      // We can do additional error handling here if needed
      console.error("Error during signup:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {signupSuccess && (
        <div className="success">
          <h1>Success!</h1>
          <p>
            Your account has been created. Please check your email for a
            verification link.
          </p>
          <Link to="/login">Click here to Sign In</Link>
          <br />
          <br />
          <br />
        </div>
      )}

      {false && (
        <Formik
          validateOnBlur={true}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
        >
          {({
            isSubmitting,
            errors,
            values,
            setFieldValue,
            resetForm,
            touched,
            setFieldTouched,
            handleSubmit,
            isValid,
          }) => {
            // If the RTK call was rejected with a 400 error, we can set the username field error
            if (principalExists) {
              //  alert(addPrincipalResult.error)
              // Double-check if user attempted the same username
              if (existingPrincipalName === values.username) {
                // Check if there's a 400 error from our server
                const maybeError: any = addPrincipalResult.error;
                const isBadRequest = maybeError?.originalStatus === 400;

                if (isBadRequest) {
                  // We'll assume the server included something in `maybeError.data`.
                  // If not, we can just provide a fallback message.
                  errors.username =
                    maybeError.data || "Username is invalid or already taken.";
                }
              } else {
                // If the user changed the username, let's free them to submit again
                isSubmitting = false;
                isValid = true;
              }
            }

            return (
              <form onSubmit={handleSubmit} className="form">
                <Row>
                  <Col md={12}>
                    <label htmlFor="firstName" className="nice-form-control">
                      <b>
                        First Name:
                        {touched.firstName && !errors.firstName && (
                          <span className="okCheck">
                            <FaCheckCircle /> looks good!
                          </span>
                        )}
                      </b>
                      <Field
                        name="firstName"
                        type="text"
                        className={
                          errors.firstName
                            ? "form-control field-error"
                            : "nice-form-control form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="firstName"
                        component="span"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <label htmlFor="lastName" className="nice-form-control">
                      <b>
                        Last Name:
                        {touched.lastName && !errors.lastName && (
                          <span className="okCheck">
                            <FaCheckCircle /> looks good!
                          </span>
                        )}
                      </b>
                      <Field
                        name="lastName"
                        type="text"
                        className={
                          errors.lastName
                            ? "form-control field-error"
                            : "form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="lastName"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    {/* If we know this username was rejected by the server, show an explicit message */}
                    {existingPrincipalName === values.username &&
                      principalExists && (
                        <div className="error">
                          &quot;{addPrincipalResult.originalArgs.username}&quot;
                          is unavailable.
                          <br />
                          {/* Could print the entire error payload for debugging: 
                        {JSON.stringify(addPrincipalResult.error)}
                        */}
                        </div>
                      )}
                    <label htmlFor="username" className="nice-form-control">
                      <b>
                        User Name:
                        {touched.username && !errors.username && (
                          <span className="okCheck">
                            <FaCheckCircle /> looks good!
                          </span>
                        )}
                      </b>
                      <Field
                        name="username"
                        type="text"
                        className={
                          errors.username
                            ? "form-control field-error"
                            : "form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="username"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <label htmlFor="email" className="nice-form-control">
                      <b>
                        Email:
                        {touched.email && !errors.email && (
                          <span className="okCheck">
                            <FaCheckCircle /> looks good!
                          </span>
                        )}
                      </b>
                      <Field
                        name="email"
                        type="text"
                        className={
                          errors.email
                            ? "form-control field-error"
                            : "form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="email"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <label htmlFor="password" className="nice-form-control">
                      <b>
                        Password:
                        {touched.password && !errors.password && (
                          <span className="okCheck">
                            <FaCheckCircle /> looks good!
                          </span>
                        )}
                      </b>
                      <Field
                        name="password"
                        type="password"
                        className={
                          errors.password
                            ? "form-control field-error"
                            : "form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="password"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <label htmlFor="acceptedTos" className="nice-form-control">
                      {touched.acceptedTos && !errors.acceptedTos && (
                        <span className="okCheck">
                          <FaCheckCircle /> <b>thank you!</b>
                        </span>
                      )}
                      I have read and agree to the
                      <b>
                        <Nav.Link
                          href="https://valkyrlabs.com/v1/docs/Legal/tos"
                          target="_blank"
                        >
                          &nbsp;Terms of Service (Click here to read TOS)
                        </Nav.Link>
                      </b>
                      <h1>
                        <BSForm.Check
                          required
                          id="acceptedTos"
                          name="acceptedTos"
                          onChange={(e) => {
                            setFieldTouched("acceptedTos", true);
                            setFieldValue("acceptedTos", e.target.checked);
                          }}
                          isInvalid={!!errors.acceptedTos}
                          className={errors.acceptedTos ? "errorCheck" : ""}
                        />
                      </h1>
                      <ErrorMessage
                        className="error"
                        name="acceptedTos"
                        component="div"
                      />{" "}
                    </label>
                  </Col>
                </Row>
                <br />
                <br />
                <Row>
                  <Col md={12}>
                    <CoolButton
                      variant={
                        touched && isValid
                          ? isSubmitting
                            ? "disabled"
                            : "success"
                          : "warning"
                      }
                      type="submit"
                      onClick={() => {}}
                    >
                      {isSubmitting && (
                        <Spinner
                          style={{ float: "left" }}
                          as="span"
                          animation="grow"
                          variant="light"
                          aria-hidden="true"
                        />
                      )}
                      <FiUserCheck size={30} />
                      Pre-Register for BETA USER Account
                    </CoolButton>
                  </Col>
                </Row>
              </form>
            );
          }}
        </Formik>
      )}
    </div>
  );
};

export default BetaSignup;
