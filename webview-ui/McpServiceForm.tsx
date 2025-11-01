import React, { useState } from "react";
import {
    useCreateMcpServiceMutation,
    useGetApisQuery,
} from "../../backend/api/McpService";

const McpServiceForm = ({ onSuccess }) => {
    const [form, setForm] = useState({
        apiId: "",
        name: "",
        description: "",
        tags: "",
        githubRepoUrl: "",
    });
    const [createMcpService, { isLoading }] = useCreateMcpServiceMutation();
    const { data: apis, isLoading: apisLoading } = useGetApisQuery();
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await createMcpService(form).unwrap();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || "Failed to publish MCP Service");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Configure New MCP Service</h2>
            {error && <div style={{ color: "red" }}>{error}</div>}
            <label>
                API:
                <select
                    name="apiId"
                    value={form.apiId}
                    onChange={handleChange}
                    disabled={apisLoading}
                    required
                >
                    <option value="">Select API</option>
                    {apis &&
                        apis.map((api) => (
                            <option key={api.id} value={api.id}>
                                {api.name}
                            </option>
                        ))}
                </select>
            </label>
            <label>
                Name:
                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                />
            </label>
            <label>
                Description:
                <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                />
            </label>
            <label>
                Tags (comma separated):
                <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                />
            </label>
            <label>
                GitHub Repo URL (optional):
                <input
                    name="githubRepoUrl"
                    value={form.githubRepoUrl}
                    onChange={handleChange}
                />
            </label>
            <button type="submit" disabled={isLoading}>
                Publish MCP Service
            </button>
        </form>
    );
};

export default McpServiceForm;
