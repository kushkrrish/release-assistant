export function formatPackagePayload(formData) {
    return {
        completed_features: formData.completed_features.map(i => i.trim()).filter(Boolean),
        bug_fixes: formData.bug_fixes.map(i => i.trim()).filter(Boolean),
        changed_behaviour: formData.changed_behaviour.map(i => i.trim()).filter(Boolean),
        qa_summary: formData.qa_summary.trim(),
        known_limitations: formData.known_limitations.map(i => i.trim()).filter(Boolean),
        migration_notes: formData.migration_notes.map(i => i.trim()).filter(Boolean),
        affected_user_groups: formData.affected_user_groups.map(i => i.trim()).filter(Boolean),
        created_by: formData.created_by.trim()
    };
}