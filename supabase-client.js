(function attachSupabaseAuth(root) {
  const config = root.SUPABASE_CONFIG || {};
  const storageKey = "agency-ops-supabase-session";
  const baseUrl = String(config.url || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  let session = null;
  let refreshPromise = null;

  function isConfigured() {
    return Boolean(config.enabled && baseUrl && config.publishableKey);
  }

  function loginIdToEmail(loginId) {
    const normalized = String(loginId || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,50}$/.test(normalized)) {
      throw new Error("아이디는 영문, 숫자, 마침표, 밑줄, 하이픈만 사용할 수 있습니다.");
    }
    return `${normalized}@${config.authEmailDomain || "users.agency-ops.app"}`;
  }

  async function request(path, options = {}) {
    const headers = {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const message = data?.msg || data?.message || data?.error_description || data?.error || `요청 실패 (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function saveSession(nextSession) {
    session = nextSession;
    localStorage.removeItem(storageKey);
    if (nextSession) sessionStorage.setItem(storageKey, JSON.stringify(nextSession));
    else sessionStorage.removeItem(storageKey);
  }

  function normalizeSession(data) {
    const expiresIn = Number(data.expires_in || 3600);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
      user: data.user,
    };
  }

  async function signIn(loginId, password) {
    const data = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: loginIdToEmail(loginId), password }),
    });
    saveSession(normalizeSession(data));
    return session;
  }

  async function createUser(loginId, password) {
    if (!password || password.length < 6) throw new Error("초기 비밀번호는 6자 이상 입력하세요.");
    const data = await request("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({
        email: loginIdToEmail(loginId),
        password,
      }),
    });
    if (!data?.user?.id) throw new Error("Supabase Auth 사용자를 생성하지 못했습니다.");
    return data.user;
  }

  async function refreshSession(refreshToken) {
    const data = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    saveSession(normalizeSession(data));
    return session;
  }

  function isExpiredAuthError(error) {
    const message = String(error?.message || error || "");
    return Number(error?.status) === 401 || /jwt\s*expired|token.*expired|invalid\s+jwt/i.test(message);
  }

  async function ensureFreshSession(force = false) {
    if (!session?.accessToken) throw new Error("로그인이 필요합니다.");
    const now = Math.floor(Date.now() / 1000);
    if (!force && Number(session.expiresAt || 0) > now + 60) return session;
    if (!session.refreshToken) {
      saveSession(null);
      throw new Error("로그인 세션이 만료되었습니다. 다시 로그인하세요.");
    }
    if (!refreshPromise) {
      refreshPromise = refreshSession(session.refreshToken)
        .catch((error) => {
          saveSession(null);
          const nextError = new Error("로그인 세션이 만료되었습니다. 다시 로그인하세요.");
          nextError.cause = error;
          throw nextError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  async function restoreSession() {
    let stored = null;
    try {
      localStorage.removeItem(storageKey);
      stored = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    } catch {
      saveSession(null);
    }
    if (!stored?.accessToken || !stored?.refreshToken) return null;
    if (Number(stored.expiresAt || 0) > Math.floor(Date.now() / 1000) + 60) {
      session = stored;
      return session;
    }
    try {
      return await refreshSession(stored.refreshToken);
    } catch {
      saveSession(null);
      return null;
    }
  }

  async function authenticatedRequest(path, options = {}) {
    await ensureFreshSession();
    const execute = () => request(path, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${session.accessToken}` },
    });
    try {
      return await execute();
    } catch (error) {
      if (!isExpiredAuthError(error)) throw error;
      await ensureFreshSession(true);
      return execute();
    }
  }

  async function loadCurrentProfile() {
    if (!session?.user?.id) throw new Error("사용자 정보를 확인할 수 없습니다.");
    const userId = encodeURIComponent(session.user.id);
    const profileFields = "user_id,login_id,display_name,team_name,subgroup_name,role,status";
    const profiles = await authenticatedRequest(
      `/rest/v1/${config.profilesTable || "app_profiles"}?select=${profileFields}&user_id=eq.${userId}&limit=1`
    );
    const profile = profiles?.[0];
    if (!profile) throw new Error("로그인 계정의 운영 프로필이 등록되지 않았습니다.");
    const projects = await authenticatedRequest(
      `/rest/v1/${config.userProjectsTable || "app_user_projects"}?select=project_name&user_id=eq.${userId}&order=project_name.asc`
    );
    return { ...profile, projects: (projects || []).map((item) => item.project_name) };
  }

  async function logout() {
    if (session?.accessToken) {
      try {
        await authenticatedRequest("/auth/v1/logout", { method: "POST" });
      } catch {
        // The local session still needs to be cleared when the remote session expired.
      }
    }
    saveSession(null);
  }

  root.SupabaseAuth = {
    isConfigured,
    loginIdToEmail,
    signIn,
    createUser,
    restoreSession,
    ensureFreshSession,
    loadCurrentProfile,
    authenticatedRequest,
    logout,
  };
})(globalThis);
