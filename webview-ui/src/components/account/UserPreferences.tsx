import React, { memo, useState, useCallback, useMemo } from "react";
import {
  UserPreference,
  UserPreferencePreferenceTypeEnum,
  Principal,
} from "@thorapi/model";
import {
  useGetUserPreferencesQuery,
  useAddUserPreferenceMutation,
  useUpdateUserPreferenceMutation,
  useDeleteUserPreferenceMutation,
} from "@thorapi/redux/services/UserPreferenceService";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import LoadingSpinner from "@thorapi/components/LoadingSpinner";
import CoolButton from "@valkyr/component-library/CoolButton";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import {
  Card,
  Badge,
  Tab,
  Tabs,
  Form,
  Row,
  Col,
  Alert,
  Modal,
} from "react-bootstrap";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaUser,
  FaCog,
  FaChartLine,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { format } from "date-fns";

const principalReference = (id?: string): Principal | undefined =>
  id ? ({ id } as Principal) : undefined;

const getPrincipalId = (principal?: Principal | null): string | undefined => {
  const id = principal?.id ?? principal?.ownerId;
  return id === undefined || id === null ? undefined : String(id);
};

const getPreferencePrincipalId = (
  preference?: Partial<UserPreference> | null,
): string | undefined => {
  if (!preference) {
    return undefined;
  }
  return (
    getPrincipalId(preference.principal) ??
    (preference as any).principalId ??
    preference.ownerId
  );
};

const getLocalPreferenceFallbacks = (): UserPreference[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const now = new Date();
  const values = [
    {
      key: "layout-mode",
      type: UserPreferencePreferenceTypeEnum.UXLAYOUT,
    },
    {
      key: "theme-mode",
      type: UserPreferencePreferenceTypeEnum.UXTHEME,
    },
    {
      key: "bootswatch-theme",
      type: UserPreferencePreferenceTypeEnum.UXTHEME,
    },
  ];

  return values.flatMap(({ key, type }) => {
    const preference = window.localStorage.getItem(key);
    if (!preference) {
      return [];
    }
    return [
      {
        id: `local-${key}`,
        preferenceType: type,
        preference,
        createdDate: now,
        lastModifiedDate: now,
      } as UserPreference,
    ];
  });
};

interface UserPreferencesProps {
  className?: string;
}

/**
 * Production-ready UserPreferences component using ThorAPI generated models and services.
 * Provides user preference management with focused ThorAPI preference calls.
 *
 * Features:
 * - Real-time data fetching from ThorAPI services
 * - CRUD operations for user preferences
 * - Tabbed interface for different preference categories
 * - Detail modal views
 * - Responsive design with VSCode theming
 * - Production-ready error handling and loading states
 */
const UserPreferences: React.FC<UserPreferencesProps> = memo(
  ({ className }) => {
    const { userInfo, authenticatedUser, jwtToken, isLoggedIn } =
      useExtensionState();
    const [activePreferenceTab, setActivePreferenceTab] =
      useState<string>("uxlayout");
    const [selectedPreference, setSelectedPreference] =
      useState<UserPreference | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingPreference, setEditingPreference] = useState<
      Partial<UserPreference>
    >({});
    const [errorMessage, setErrorMessage] = useState<string>("");

    // ThorAPI Service Hooks - Production Ready Data Fetching
    const {
      data: userPreferences = [],
      isLoading: preferencesLoading,
      error: preferencesError,
      refetch: refetchPreferences,
    } = useGetUserPreferencesQuery({
      authSessionKey:
        jwtToken ||
        userInfo?.id ||
        authenticatedUser?.id ||
        (isLoggedIn ? "authenticated" : "anonymous"),
    });
    const localFallbackPreferences = useMemo(getLocalPreferenceFallbacks, []);
    const usingLocalPreferenceFallback =
      Boolean(preferencesError) && userPreferences.length === 0;
    const effectiveUserPreferences =
      usingLocalPreferenceFallback
        ? localFallbackPreferences
        : userPreferences;

    // ThorAPI Mutation Hooks
    const [addUserPreference, { isLoading: isAdding }] =
      useAddUserPreferenceMutation();
    const [updateUserPreference, { isLoading: isUpdating }] =
      useUpdateUserPreferenceMutation();
    const [deleteUserPreference, { isLoading: isDeleting }] =
      useDeleteUserPreferenceMutation();

    // Get current user's principal ID for filtering
    const currentPrincipalId = userInfo?.id || authenticatedUser?.id;

    // Filter user preferences for current user. If no principal is available yet,
    // keep the API rows visible instead of blanking the tab.
    const currentUserPreferences = useMemo(() => {
      if (!currentPrincipalId || usingLocalPreferenceFallback) {
        return effectiveUserPreferences;
      }
      return effectiveUserPreferences.filter(
        (pref) => getPreferencePrincipalId(pref) === currentPrincipalId,
      );
    }, [
      effectiveUserPreferences,
      currentPrincipalId,
      usingLocalPreferenceFallback,
    ]);

    // Filtered preferences by type for tabbed interface
    const preferencesByType = useMemo(() => {
      return {
        "ux-layout": currentUserPreferences.filter(
          (p) => p.preferenceType === UserPreferencePreferenceTypeEnum.UXLAYOUT,
        ),
        "ux-mode": currentUserPreferences.filter(
          (p) => p.preferenceType === UserPreferencePreferenceTypeEnum.UXMODE,
        ),
        "ux-theme": currentUserPreferences.filter(
          (p) => p.preferenceType === UserPreferencePreferenceTypeEnum.UXTHEME,
        ),
        measurement: currentUserPreferences.filter(
          (p) =>
            p.preferenceType === UserPreferencePreferenceTypeEnum.MEASUREMENT,
        ),
      };
    }, [currentUserPreferences]);

    // Combined loading state
    const isLoading = preferencesLoading;

    // Statistics calculations
    const stats = useMemo(() => {
      return {
        totalPreferences: currentUserPreferences.length,
      };
    }, [currentUserPreferences]);

    // Handle preference operations
    const handleSavePreference = useCallback(async () => {
      try {
        setErrorMessage("");

        if (selectedPreference?.id) {
          // Update existing preference
          await updateUserPreference({
            id: selectedPreference.id,
            ...editingPreference,
          }).unwrap();
        } else {
          // Create new preference
          await addUserPreference({
            ...editingPreference,
            principal: principalReference(currentPrincipalId),
          }).unwrap();
        }

        setShowEditModal(false);
        setEditingPreference({});
        setSelectedPreference(null);
        refetchPreferences();
      } catch (error: any) {
        console.error("Error saving preference:", error);
        setErrorMessage(error?.data?.message || "Failed to save preference");
      }
    }, [
      selectedPreference,
      editingPreference,
      currentPrincipalId,
      updateUserPreference,
      addUserPreference,
      refetchPreferences,
    ]);

    const handleDeletePreference = useCallback(
      async (preference: UserPreference) => {
        if (!preference.id) return;

        try {
          setErrorMessage("");
          await deleteUserPreference(Number(preference.id)).unwrap();
          refetchPreferences();
        } catch (error: any) {
          console.error("Error deleting preference:", error);
          setErrorMessage(
            error?.data?.message || "Failed to delete preference",
          );
        }
      },
      [deleteUserPreference, refetchPreferences],
    );

    const handleEditPreference = useCallback(
      (preference: UserPreference | null) => {
        setSelectedPreference(preference);
        setEditingPreference(
          preference || {
            preferenceType: UserPreferencePreferenceTypeEnum.UXLAYOUT,
          },
        );
        setShowEditModal(true);
      },
      [],
    );

    const handleViewDetails = useCallback((preference: UserPreference) => {
      setSelectedPreference(preference);
      setShowDetailModal(true);
    }, []);

    // Render preference type tabs
    const renderPreferenceTabs = () => (
      <Tabs
        activeKey={activePreferenceTab}
        onSelect={(key) => key && setActivePreferenceTab(key)}
        className="mb-3"
      >
        <Tab
          eventKey="uxlayout"
          title={
            <>
              <FaCog className="me-2" />
              Layout ({preferencesByType["ux-layout"].length})
            </>
          }
        >
          {renderPreferenceList(preferencesByType["ux-layout"])}
        </Tab>
        <Tab
          eventKey="uxmode"
          title={
            <>
              <FaUser className="me-2" />
              Mode ({preferencesByType["ux-mode"].length})
            </>
          }
        >
          {renderPreferenceList(preferencesByType["ux-mode"])}
        </Tab>
        <Tab
          eventKey="uxtheme"
          title={
            <>
              <FaCog className="me-2" />
              Theme ({preferencesByType["ux-theme"].length})
            </>
          }
        >
          {renderPreferenceList(preferencesByType["ux-theme"])}
        </Tab>
        <Tab
          eventKey="measurement"
          title={
            <>
              <FaChartLine className="me-2" />
              Measurements ({preferencesByType["measurement"].length})
            </>
          }
        >
          {renderPreferenceList(preferencesByType["measurement"])}
        </Tab>
      </Tabs>
    );

    // Render preference list for each tab
    const renderPreferenceList = (preferences: UserPreference[]) => (
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Preferences ({preferences.length})</h6>
          <CoolButton
            variant="primary"
            size="sm"
            onClick={() => handleEditPreference(null)}
            disabled={isAdding}
          >
            <FaPlus className="me-1" />
            Add Preference
          </CoolButton>
        </Card.Header>
        <Card.Body>
          {preferences.length === 0 ? (
            <div className="text-center text-muted py-3">
              <p>No preferences found for this category.</p>
              <CoolButton
                variant="outline-primary"
                onClick={() => handleEditPreference(null)}
              >
                <FaPlus className="me-1" />
                Create First Preference
              </CoolButton>
            </div>
          ) : (
            <div className="row">
              {preferences.map((pref) => (
                <div key={pref.id} className="col-md-6 col-lg-4 mb-3">
                  <Card className="h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg="info" className="mb-2">
                          {pref.preferenceType?.replace("-", " ").toUpperCase()}
                        </Badge>
                        <div className="btn-group btn-group-sm">
                          <VSCodeButton
                            appearance="icon"
                            onClick={() => handleViewDetails(pref)}
                            title="View Details"
                          >
                            <FaUser />
                          </VSCodeButton>
                          <VSCodeButton
                            appearance="icon"
                            onClick={() => handleEditPreference(pref)}
                            title="Edit"
                          >
                            <FaEdit />
                          </VSCodeButton>
                          <VSCodeButton
                            appearance="icon"
                            onClick={() => handleDeletePreference(pref)}
                            disabled={isDeleting}
                            title="Delete"
                          >
                            <FaTrash />
                          </VSCodeButton>
                        </div>
                      </div>
                      <h6 className="card-title">
                        {pref.preference || "Untitled Preference"}
                      </h6>
                      <small className="text-muted">
                        Created:{" "}
                        {pref.createdDate
                          ? format(new Date(pref.createdDate), "MMM dd, yyyy")
                          : "N/A"}
                        <br />
                        Modified:{" "}
                        {pref.lastModifiedDate
                          ? format(
                              new Date(pref.lastModifiedDate),
                              "MMM dd, yyyy",
                            )
                          : "N/A"}
                      </small>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );

    // Render stats overview
    const renderStatsOverview = () => (
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <FaCog size={24} className="text-primary mb-2" />
              <h5>{stats.totalPreferences}</h5>
              <small className="text-muted">User Preferences</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <FaCog size={24} className="text-info mb-2" />
              <h5>{preferencesByType["ux-layout"].length}</h5>
              <small className="text-muted">Layout</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <FaChartLine size={24} className="text-success mb-2" />
              <h5>{preferencesByType.measurement.length}</h5>
              <small className="text-muted">Measurements</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );

    // Render edit modal
    const renderEditModal = () => (
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEdit className="me-2" />
            {selectedPreference ? "Edit Preference" : "Add New Preference"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMessage && (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setErrorMessage("")}
            >
              {errorMessage}
            </Alert>
          )}
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preference Type</Form.Label>
                  <Form.Select
                    value={editingPreference.preferenceType || ""}
                    onChange={(e) =>
                      setEditingPreference({
                        ...editingPreference,
                        preferenceType: e.target
                          .value as UserPreferencePreferenceTypeEnum,
                      })
                    }
                  >
                    <option value="">Select Type...</option>
                    <option value={UserPreferencePreferenceTypeEnum.UXLAYOUT}>
                      UX Layout
                    </option>
                    <option value={UserPreferencePreferenceTypeEnum.UXMODE}>
                      UX Mode
                    </option>
                    <option value={UserPreferencePreferenceTypeEnum.UXTHEME}>
                      UX Theme
                    </option>
                    <option
                      value={UserPreferencePreferenceTypeEnum.MEASUREMENT}
                    >
                      Measurement
                    </option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Principal ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      getPreferencePrincipalId(editingPreference) ||
                      currentPrincipalId ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingPreference({
                        ...editingPreference,
                        principal: principalReference(e.target.value),
                      })
                    }
                    placeholder="Enter Principal ID"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Preference Value</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editingPreference.preference || ""}
                    onChange={(e) =>
                      setEditingPreference({
                        ...editingPreference,
                        preference: e.target.value,
                      })
                    }
                    placeholder="Enter preference value (JSON, string, etc.)"
                  />
                  <Form.Text className="text-muted">
                    This can be JSON configuration, simple string values, or any
                    preference data.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <VSCodeButton
            appearance="secondary"
            onClick={() => setShowEditModal(false)}
          >
            <FaTimes className="me-1" />
            Cancel
          </VSCodeButton>
          <CoolButton
            variant="primary"
            onClick={handleSavePreference}
            disabled={
              isAdding || isUpdating || !editingPreference.preferenceType
            }
          >
            <FaSave className="me-1" />
            {isAdding || isUpdating ? "Saving..." : "Save Preference"}
          </CoolButton>
        </Modal.Footer>
      </Modal>
    );

    // Render detail modal
    const renderDetailModal = () => (
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUser className="me-2" />
            Preference Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPreference && (
            <Row>
              <Col md={6}>
                <Card>
                  <Card.Header>Basic Information</Card.Header>
                  <Card.Body>
                    <dl className="row">
                      <dt className="col-sm-4">ID:</dt>
                      <dd className="col-sm-8">
                        {selectedPreference.id || "N/A"}
                      </dd>

                      <dt className="col-sm-4">Type:</dt>
                      <dd className="col-sm-8">
                        <Badge bg="primary">
                          {selectedPreference.preferenceType}
                        </Badge>
                      </dd>

                      <dt className="col-sm-4">Principal ID:</dt>
                      <dd className="col-sm-8">
                        {getPreferencePrincipalId(selectedPreference) || "N/A"}
                      </dd>

                      <dt className="col-sm-4">Owner ID:</dt>
                      <dd className="col-sm-8">
                        {selectedPreference.ownerId || "N/A"}
                      </dd>
                    </dl>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header>Audit Information</Card.Header>
                  <Card.Body>
                    <dl className="row">
                      <dt className="col-sm-5">Created:</dt>
                      <dd className="col-sm-7">
                        {selectedPreference.createdDate
                          ? format(
                              new Date(selectedPreference.createdDate),
                              "MMM dd, yyyy HH:mm",
                            )
                          : "N/A"}
                      </dd>

                      <dt className="col-sm-5">Last Modified:</dt>
                      <dd className="col-sm-7">
                        {selectedPreference.lastModifiedDate
                          ? format(
                              new Date(selectedPreference.lastModifiedDate),
                              "MMM dd, yyyy HH:mm",
                            )
                          : "N/A"}
                      </dd>

                      <dt className="col-sm-5">Last Modified By:</dt>
                      <dd className="col-sm-7">
                        {selectedPreference.lastModifiedById || "N/A"}
                      </dd>

                      <dt className="col-sm-5">Last Accessed:</dt>
                      <dd className="col-sm-7">
                        {selectedPreference.lastAccessedDate
                          ? format(
                              new Date(selectedPreference.lastAccessedDate),
                              "MMM dd, yyyy HH:mm",
                            )
                          : "N/A"}
                      </dd>
                    </dl>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} className="mt-3">
                <Card>
                  <Card.Header>Preference Value</Card.Header>
                  <Card.Body>
                    <pre className="bg-light p-3 rounded">
                      {selectedPreference.preference ||
                        "No preference value set"}
                    </pre>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <VSCodeButton
            appearance="secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </VSCodeButton>
          <CoolButton
            variant="primary"
            onClick={() => {
              setShowDetailModal(false);
              handleEditPreference(selectedPreference);
            }}
          >
            <FaEdit className="me-1" />
            Edit Preference
          </CoolButton>
        </Modal.Footer>
      </Modal>
    );

    const formatQueryError = (error: unknown): string => {
      if (!error) {
        return "Unable to load preferences.";
      }
      if (typeof error === "string") {
        return error;
      }
      const candidate = error as any;
      if (typeof candidate?.data?.message === "string") {
        return candidate.data.message;
      }
      if (typeof candidate?.error === "string") {
        return candidate.error;
      }
      if (typeof candidate?.status === "number") {
        return `ThorAPI returned HTTP ${candidate.status}.`;
      }
      if (typeof candidate?.status === "string") {
        return "Preferences are temporarily unavailable.";
      }
      return "Unable to load preferences.";
    };

    // Loading state
    if (isLoading) {
      return (
        <div
          className={`user-preferences-loading ${className}`}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <div className="text-center">
            <LoadingSpinner label="Loading user preferences..." size={32} />
            <div className="mt-3">
              <small className="text-muted">Fetching preferences...</small>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`user-preferences ${className}`}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3>
              <FaUser className="me-2" />
              User Preferences
            </h3>
            <p className="text-muted mb-0">Manage your ValorIDE preferences.</p>
          </div>
          <div>
            <CoolButton
              variant="primary"
              onClick={() => handleEditPreference(null)}
              disabled={isAdding}
            >
              <FaPlus className="me-1" />
              Add Preference
            </CoolButton>
          </div>
        </div>

        {preferencesError && (
          <Alert variant="warning">
            <div className="d-flex justify-content-between align-items-center gap-3">
              <span>
                Preferences are using local fallback data.{" "}
                {formatQueryError(preferencesError)}
              </span>
              <CoolButton
                variant="outline-warning"
                size="sm"
                onClick={() => {
                  setErrorMessage("");
                  refetchPreferences();
                }}
              >
                Retry
              </CoolButton>
            </div>
          </Alert>
        )}

        {/* Statistics Overview */}
        {renderStatsOverview()}

        <VSCodeDivider />

        {/* User Preferences Tabs */}
        <div className="mt-4">
          <h4 className="mb-3">
            <FaCog className="me-2" />
            Your Preferences
          </h4>
          {renderPreferenceTabs()}
        </div>

        {/* Modals */}
        {renderEditModal()}
        {renderDetailModal()}
      </div>
    );
  },
);

UserPreferences.displayName = "UserPreferences";

export default UserPreferences;
