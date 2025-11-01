import {
  ErrorMessage,
  Field,
  Formik,
  FormikHelpers,
  FormikValues,
} from "formik";
import React, { useEffect } from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import * as Yup from "yup";

// custom redux implementations go here...

import { useLoginUserMutation } from "../../redux/services/LoginService";
import { Login } from "@thor/model";
import CoolButton from "@valkyr/component-library/CoolButton";
import ErrorModal from "../ErrorModal";
import LoadingSpinner from "@valkyr/component-library/LoadingSpinner";
import {
  storeJwtToken,
  writeStoredPrincipal,
} from "../../utils/accessControl";
import { useExtensionState } from "@/context/ExtensionStateContext";

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .min(4, "User Name must be minimum 4 characters")
    .max(20, "Name must not be more than 100 characters")
    .required("User Name is required"),
});

interface FormProps {
  onSubmit?: (values: Login, formikHelpers: FormikHelpers<Login>) => Promise<void>;
  isLoggedIn?: boolean;
}

const Form: React.FC<FormProps> = ({
  onSubmit: externalOnSubmit,
  isLoggedIn = false,
}) => {
  const [loginUser, loginUserResult] = useLoginUserMutation();
  const navigate = useNavigate();
  const { isLoggedIn: contextLoggedIn, jwtToken } = useExtensionState();
  const loginFailed = loginUserResult.status === "rejected";
  const loginSuccess = loginUserResult.status === "fulfilled";

  if (loginSuccess) {
    // If the response contains a token, store it
    if (loginUserResult.data && loginUserResult.data.token) {
      storeJwtToken(loginUserResult.data.token, "login-form");

      const rawPrincipal = loginUserResult.data.authenticatedPrincipal;
      let parsedPrincipal: unknown = rawPrincipal;
      try {
        if (typeof rawPrincipal === "string") {
          parsedPrincipal = JSON.parse(rawPrincipal);
        }
      } catch (err) {
        console.warn("Unable to parse authenticatedPrincipal", err);
        parsedPrincipal = rawPrincipal;
      }

      writeStoredPrincipal(parsedPrincipal as any);
    }
    // Redirect back if ?redirect= was provided
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    navigate(redirect || "/dashboard");
  }

  useEffect(() => {
    if (externalOnSubmit) {
      return;
    }
    if (isLoggedIn || contextLoggedIn || jwtToken) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      navigate(redirect || "/dashboard");
    }
  }, [contextLoggedIn, externalOnSubmit, jwtToken, navigate, isLoggedIn]);

  const initialValues: Login = {
    username: "",
    password: "",
  };

  const handleSubmit = async (
    values: FormikValues,
    formikHelpers: FormikHelpers<Login>,
  ) => {
    const { setSubmitting } = formikHelpers;
    try {
      if (externalOnSubmit) {
        // Use external handler (from AccountView)
        await externalOnSubmit(values as Login, formikHelpers);
      } else {
        // Use internal handler (standalone usage)
        setTimeout(() => {
          console.log(values);
          loginUser(values);
          setSubmitting(false);
        }, 0);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitting(false);
    }
  };

  return (
    <div>
      {loginSuccess && (
        <div className="success">
          <h1>Success!</h1>
          <p>Enjoy your experience...</p>
        </div>
      )}

      {!loginSuccess && (
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
            if (loginFailed) {
              touched = {};
            }
            return (
              <form onSubmit={handleSubmit} className="form">
                {/**
                 * 
                 * 
                 * "requestId":"81YvHHjXbrbNZj6pVEsOS","status":"rejected","endpointName":"signupUser","startedTimeStamp":1729699355360,"error":{"status":"PARSING_ERROR","originalStatus":400,"data":"Username is already taken.","error":"SyntaxError: Unexpected token 'U', \"Username i\"... is not valid JSON"},"isUninitialized":false,"isLoading":false,"isSuccess":false,"isError":true,"originalArgs":{"firstName":"John","lastName":"McMahon","username":"super","email":"john@starter.io","password":"testsetaS3","acceptedTos":true}}
                 * 

                <Row>
                  <Col>
                    <Accordion defaultActiveKey="-1">
                      <Accordion.Item eventKey="0">
                        <Accordion.Header>Debug</Accordion.Header>
                        <Accordion.Body>
                          errors: {JSON.stringify(errors)}
                          <br />
                          touched: {JSON.stringify(touched)}
                          <br />
                          loginUserResult: {JSON.stringify(loginUserResult)}
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                  </Col>
                </Row>

*/}

                {/* Global error inline card */}
                {loginFailed && (
                  <ErrorModal
                    variant="inline"
                    severity="danger"
                    title="Login Failed"
                    errorMessage={`"${loginUserResult?.originalArgs?.username}" could not sign in.\n${JSON.stringify(
                      loginUserResult?.error || "Unknown error",
                    )}`}
                    callback={() => {
                      /* dismiss by retrying or editing fields */
                    }}
                  />
                )}
                <Row>
                  <Col md={12}>
                    <label htmlFor="username" className="nice-form-control">
                      <b>
                        User Name:{" "}
                        {touched.username && !errors.username && (
                          <span className="okCheck">
                            <FaCheckCircle />
                          </span>
                        )}
                      </b>
                      <Field
                        name="username"
                        type="text"
                        className={
                          errors.username
                            ? "form-control field-error"
                            : " form-control"
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
                    <label htmlFor="password" className="nice-form-control">
                      <b>
                        Password:{" "}
                        {touched.password && !errors.password && (
                          <span className="okCheck">
                            <FaCheckCircle />
                          </span>
                        )}
                      </b>
                      <Field
                        name="password"
                        type="password"
                        className={
                          errors.password
                            ? "form-control field-error"
                            : " form-control"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="password"
                        component="div"
                      />
                      <div style={{ marginTop: 6 }}>
                        <Link to="/forgot-password">Forgot your password?</Link>
                      </div>
                    </label>
                  </Col>
                </Row>

                <br />
                <br />
                <Row>
                  <Col>
                    <CoolButton
                      variant={
                        touched && isValid
                          ? isSubmitting
                            ? "disabled"
                            : "success"
                          : "info"
                      }
                      // disabled={!(touched && isValid && (loginUserResult.status == 'uninitialized'))}
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
                      <FiUserCheck size={30} /> Login Now
                    </CoolButton>
                  </Col>
                </Row>

                {/* Loader overlay during submission */}
                {isSubmitting && (
                  <LoadingSpinner size={128} label="Signing you in..." />
                )}
              </form>
            );
          }}
        </Formik>
      )}
    </div>
  );
};

export default Form;
