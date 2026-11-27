(function attachSupabaseData(root) {
  const auth = root.SupabaseAuth;
  const tableKeys = {
    projects: "project_id",
    teams: "team_id",
    positions: "position_id",
    employees: "employee_id",
    project_members: "assignment_id",
    task_history: "task_id",
    output_history: "output_id",
    output_rules: "rule_id",
    project_changes: "change_id",
    worker_task_status: "assignment_id",
    work_resources: "resource_id",
    notification_states: "state_id",
    upload_batches: "batch_id",
    upload_batch_items: "item_id",
  };
  const requiredColumns = {
    projects: ["project_id", "client_name", "project_name", "direction", "status", "start_date", "end_date", "monthly_contract_amount", "total_contract_amount", "planned_people", "management_people", "monthly_person_cost", "parent_project_id", "note", "unit_price", "assigned_team_id", "sla_days", "absolute_daily_hours", "assignment_daily_target", "assignment_monthly_target", "public_daily_enabled"],
    teams: ["team_id", "team_name", "base_group", "subgroup_name", "subgroups", "active_yn", "note"],
    positions: ["position_id", "position_name", "active_yn", "note"],
    employees: ["employee_id", "employee_name", "team_id", "position_id", "grade", "employment_status", "joined_date", "left_date", "resignation_reason", "subgroup_name", "reduced_work_yn", "reduced_work_start_date", "reduced_work_end_date", "reduced_work_start_time", "reduced_work_end_time", "reduced_daily_hours", "note"],
    project_members: ["assignment_id", "project_id", "employee_id", "role", "assigned_from", "assigned_to", "active_yn", "change_reason"],
    task_history: ["task_id", "project_id", "request_date", "task_title", "task_type", "request_channel", "difficulty", "urgent_yn", "requester_name", "owner_employee_id", "planned_hours", "effort_buffer_pct", "photo_type", "status", "due_date", "completed_date", "rework_yn", "rejected_yn", "approval_delay_yn", "night_weekend_yn", "note"],
    output_history: ["output_id", "task_id", "project_id", "deliverable_name", "quantity", "standard_hours_per_unit", "owner_employee_id", "inspection_status", "file_link", "note"],
    output_rules: ["rule_id", "project_id", "deliverable_name", "standard_hours", "sla_days", "sla_enabled", "conversion_target_rule_id", "active_from", "active_to", "active_yn", "note"],
    project_changes: ["change_id", "project_id", "changed_at", "category", "field_name", "before_value", "after_value", "reason", "changed_by_employee_id"],
    worker_task_status: ["assignment_id", "task_id", "employee_id", "user_id", "status", "started_at", "completed_at", "updated_at"],
    notification_states: ["state_id", "notification_key", "user_id", "read_at", "resolved_at", "updated_at"],
  };

  async function selectAll(table) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await auth.authenticatedRequest(`/rest/v1/${table}?select=*&limit=1000&offset=${offset}`);
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  // Bound parallel reads so large histories do not flood the connection pool.
  async function mapConcurrent(items, limit, mapper) {
    const results = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await mapper(items[index]);
      }
    }));
    return results;
  }

  async function loadAll() {
    const optionalTables = ["employee_review_entries", "work_resources", "app_settings", "notification_states", "upload_batches", "upload_batch_items"];
    const names = [...Object.keys(tableKeys).filter((name) => !optionalTables.includes(name)), "app_profiles", "app_user_projects", ...optionalTables];
    let employeeReviewReady = false;
    const results = await mapConcurrent(names, 6, async (name) => {
      try {
        const rows = await selectAll(name);
        if (name === "employee_review_entries") employeeReviewReady = true;
        return [name, rows];
      } catch (error) {
        if (!optionalTables.includes(name)) throw error;
        console.info(`${name} 테이블을 불러오지 못해 기본값을 사용합니다.`, error);
        return [name, []];
      }
    });
    return { ...Object.fromEntries(results), employee_review_ready: employeeReviewReady };
  }

  async function loadTables(names) {
    const uniqueNames = [...new Set(names || [])].filter((name) => tableKeys[name]);
    const results = await Promise.all(uniqueNames.map(async (name) => [name, await selectAll(name)]));
    return Object.fromEntries(results);
  }

  async function validateSchema() {
    const results = await mapConcurrent(Object.entries(requiredColumns), 4, async ([table, columns]) => {
      try {
        await auth.authenticatedRequest(`/rest/v1/${table}?select=${encodeURIComponent(columns.join(","))}&limit=0`);
        return null;
      } catch (error) {
        return { table, message: String(error?.message || error || "스키마 확인 실패") };
      }
    });
    return results.filter(Boolean);
  }

  async function upsert(table, rows) {
    if (!rows?.length) return;
    const key = tableKeys[table];
    for (let index = 0; index < rows.length; index += 400) {
      const chunk = rows.slice(index, index + 400);
      await auth.authenticatedRequest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
    }
  }

  async function removeIds(table, ids) {
    if (!ids?.length) return;
    const key = tableKeys[table];
    for (let index = 0; index < ids.length; index += 100) {
      const values = ids.slice(index, index + 100).map((value) => `"${String(value).replace(/"/g, '\\"')}"`).join(",");
      await auth.authenticatedRequest(`/rest/v1/${table}?${key}=in.(${encodeURIComponent(values)})`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    }
  }

  async function updateProfile(userId, values) {
    if (!userId) throw new Error("로그인 프로필의 사용자 ID를 확인할 수 없습니다.");
    await auth.authenticatedRequest(`/rest/v1/app_profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
    });
  }

  async function createProfile(userId, values, projects = []) {
    if (!userId) throw new Error("생성한 Auth 사용자의 ID를 확인할 수 없습니다.");
    await auth.authenticatedRequest("/rest/v1/app_profiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, ...values }),
    });
    if (projects.length) {
      await auth.authenticatedRequest("/rest/v1/app_user_projects", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(projects.map((project_name) => ({ user_id: userId, project_name }))),
      });
    }
  }

  async function upsertAuthAccount(values) {
    const rows = await auth.authenticatedRequest("/rest/v1/rpc/app_admin_upsert_auth_account", {
      method: "POST",
      body: JSON.stringify({
        p_login_id: values.login_id,
        p_password: values.password || "",
        p_display_name: values.display_name,
        p_team_name: values.team_name || "",
        p_subgroup_name: values.subgroup_name || "",
        p_role: values.role,
        p_status: values.status || "사용",
        p_projects: values.projects || [],
      }),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function deleteProfile(userId) {
    if (!userId) throw new Error("삭제할 로그인 프로필의 사용자 ID를 확인할 수 없습니다.");
    await auth.authenticatedRequest(`/rest/v1/app_profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  async function saveSetting(settingKey, settingValue) {
    const payload = {
      setting_value: settingValue,
      updated_at: new Date().toISOString(),
    };
    try {
      const rpcRows = await auth.authenticatedRequest("/rest/v1/rpc/app_save_setting", {
        method: "POST",
        body: JSON.stringify({
          p_setting_key: settingKey,
          p_setting_value: settingValue,
        }),
      });
      return Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    } catch (error) {
      if (!/app_save_setting|function/i.test(String(error?.message || ""))) throw error;
    }
    const updated = await auth.authenticatedRequest(`/rest/v1/app_settings?setting_key=eq.${encodeURIComponent(settingKey)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (Array.isArray(updated) && updated.length) return updated[0];
    const inserted = await auth.authenticatedRequest("/rest/v1/app_settings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        setting_key: settingKey,
        ...payload,
      }),
    });
    return Array.isArray(inserted) ? inserted[0] : inserted;
  }

  const workResourceBucket = "work-resource-images";
  const encodedStoragePath = (path) => String(path || "").split("/").map(encodeURIComponent).join("/");

  async function uploadWorkResourceImages(projectId, resourceId, files) {
    if (!projectId || !resourceId) throw new Error("이미지를 저장할 프로젝트 또는 업무 자료 ID가 없습니다.");
    const images = [...(files || [])];
    if (images.length > 20) throw new Error("업무 자료 이미지는 한 건당 최대 20장까지 등록할 수 있습니다.");
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const uploaded = [];
    for (let index = 0; index < images.length; index += 1) {
      const file = images[index];
      if (!allowed.has(file.type)) throw new Error(`${file.name}: 지원하지 않는 이미지 형식입니다.`);
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: 이미지 크기는 10MB 이하여야 합니다.`);
      const safeName = String(file.name || `image-${index + 1}`).replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `${projectId}/${resourceId}/${Date.now()}-${index + 1}-${safeName}`;
      await auth.authenticatedRequest(`/storage/v1/object/${workResourceBucket}/${encodedStoragePath(path)}`, {
        method: "POST",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      uploaded.push(path);
    }
    return uploaded;
  }

  async function signedWorkResourceImageUrl(path, expiresIn = 3600) {
    const result = await auth.authenticatedRequest(`/storage/v1/object/sign/${workResourceBucket}/${encodedStoragePath(path)}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn }),
    });
    const signedPath = result?.signedURL || result?.signedUrl || "";
    if (!signedPath) throw new Error("첨부 이미지 주소를 생성하지 못했습니다.");
    const configuredUrl = String(root.SUPABASE_CONFIG?.url || "").replace(/\/$/, "");
    if (/^https?:\/\//i.test(signedPath)) return signedPath;
    if (signedPath.startsWith("/storage/v1/")) return `${configuredUrl}${signedPath}`;
    return `${configuredUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
  }

  async function removeWorkResourceImages(paths) {
    const prefixes = [...(paths || [])].filter(Boolean);
    if (!prefixes.length) return;
    await auth.authenticatedRequest(`/storage/v1/object/${workResourceBucket}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes }),
    });
  }

  root.SupabaseData = { loadAll, loadTables, validateSchema, upsert, removeIds, updateProfile, createProfile, upsertAuthAccount, deleteProfile, saveSetting, uploadWorkResourceImages, signedWorkResourceImageUrl, removeWorkResourceImages, tableKeys, requiredColumns };
})(globalThis);
