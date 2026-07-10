// --- In-Memory Mock Database for Standalone Frontend Sandbox ---

export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  avatar_url: string | null;
  created_at: string;
  profile: any;
}

export interface MockTask {
  id: number;
  sprint_id: number;
  assigned_to_id: number | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  github_pr_url: string | null;
  assignee: { id: number; name: string } | null;
}

export interface MockSprint {
  id: number;
  project_id: number;
  sprint_number: number;
  start_date: string;
  end_date: string;
  goal: string | null;
  tasks: MockTask[];
}

// Initial Mock Database State
let mockUsers: User[] = [
  {
    id: 1,
    name: "Atul Sharma",
    email: "student1@codercorps.com",
    role: "student",
    avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    created_at: new Date().toISOString(),
    profile: {
      bio: "Aspiring Full Stack Engineer. Love building backend services and distributed systems.",
      college: "Delhi Technological University",
      skills: ["Python", "JavaScript", "SQL", "React", "Docker"],
      github_url: "https://github.com/atulsharma-dev",
      linkedin_url: "https://linkedin.com/in/atulsharma",
      resume_url: "",
      is_public: true
    }
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "student2@codercorps.com",
    role: "student",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    created_at: new Date().toISOString(),
    profile: {
      bio: "Passionate about UI/UX and React frontends. Exploring backend engineering.",
      college: "RV College of Engineering",
      skills: ["React", "TailwindCSS", "TypeScript", "Node.js"],
      github_url: "https://github.com/priyapatel-dev",
      linkedin_url: "https://linkedin.com/in/priya-patel",
      resume_url: "",
      is_public: true
    }
  },
  {
    id: 3,
    name: "Siddharth Roy",
    email: "mentor@codercorps.com",
    role: "mentor",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    created_at: new Date().toISOString(),
    profile: {
      bio: "Senior Staff Engineer with 12+ years experience building cloud services.",
      college: "IIT Bombay",
      skills: ["System Design", "Python", "Kubernetes", "PostgreSQL", "React"],
      github_url: "https://github.com/mentor-siddharth",
      linkedin_url: "https://linkedin.com/in/siddharth-roy",
      resume_url: "",
      is_public: true
    }
  }
];

let mockProjects = [
  {
    id: 1,
    title: "Distributed E-Commerce API Engine",
    description: "A high-performance e-commerce API supporting bulk catalogs, real-time inventory updates, and order placement under load.",
    status: "active",
    mentor_id: 3,
    created_at: new Date().toISOString(),
    mentor: { id: 3, name: "Siddharth Roy" },
    members: [
      { user_id: 3, role: "lead", user: { id: 3, name: "Siddharth Roy" } },
      { user_id: 1, role: "contributor", user: { id: 1, name: "Atul Sharma" } },
      { user_id: 2, role: "contributor", user: { id: 2, name: "Priya Patel" } }
    ]
  }
];

let mockSprints: MockSprint[] = [
  {
    id: 1,
    project_id: 1,
    sprint_number: 1,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    goal: "Establish base architecture, database models, and authentication.",
    tasks: [
      {
        id: 1,
        sprint_id: 1,
        assigned_to_id: 1,
        title: "Design core DB schema & implement SQLAlchemy models",
        description: "Establish standard user, project, sprint, task, and submission tables using clean foreign key integrity.",
        status: "done" as const,
        github_pr_url: "https://github.com/codercorps/ecommerce-api/pull/1",
        assignee: { id: 1, name: "Atul Sharma" }
      },
      {
        id: 2,
        sprint_id: 1,
        assigned_to_id: 2,
        title: "Set up JWT Authentication & Route Guards",
        description: "Implement backend login/signup/refresh logic and frontend route protection context.",
        status: "in_progress" as const,
        github_pr_url: null,
        assignee: { id: 2, name: "Priya Patel" }
      },
      {
        id: 3,
        sprint_id: 1,
        assigned_to_id: 1,
        title: "Create Docker Compose configuration for local testing",
        description: "Configure Postgres and backend containers for quick team onboarding.",
        status: "todo" as const,
        github_pr_url: null,
        assignee: { id: 1, name: "Atul Sharma" }
      }
    ]
  }
];

let mockSubmissions: any[] = [];
let mockCertificates: any[] = [];
let mockCurrentUser: User | null = null;

// Helper to find a user by ID
const findUser = (id: number) => mockUsers.find(u => u.id === id) || null;

export function handleMockRequest(path: string, method: string, body?: any) {
  console.log(`[Mock DB Intercept] ${method} ${path}`, body);

  // --- Auth endpoints ---
  if (path === "/auth/me" && method === "GET") {
    if (!mockCurrentUser) return { status: 401, ok: false, json: async () => ({ detail: "Not authenticated" }) };
    return { status: 200, ok: true, json: async () => mockCurrentUser };
  }

  if (path === "/auth/login" && method === "POST") {
    // Body is FormData for OAuth2
    const username = body?.get ? body.get("username") : body?.username;
    const user = mockUsers.find(u => u.email === username);
    if (!user) {
      return { status: 400, ok: false, json: async () => ({ detail: "Incorrect email or password" }) };
    }
    mockCurrentUser = user;
    return {
      status: 200,
      ok: true,
      json: async () => ({
        access_token: "mock-access-token",
        token_type: "bearer",
        refresh_token: "mock-refresh-token",
        user
      })
    };
  }

  if (path === "/auth/signup" && method === "POST") {
    const { name, email, role } = body;
    const existing = mockUsers.find(u => u.email === email);
    if (existing) return { status: 400, ok: false, json: async () => ({ detail: "User already exists" }) };

    const newUser: User = {
      id: mockUsers.length + 1,
      name,
      email,
      role: role as any,
      avatar_url: null,
      created_at: new Date().toISOString(),
      profile: {
        bio: "",
        college: "",
        skills: [],
        github_url: "",
        linkedin_url: "",
        resume_url: "",
        is_public: true
      }
    };
    mockUsers.push(newUser);
    mockCurrentUser = newUser;
    return {
      status: 201,
      ok: true,
      json: async () => ({
        access_token: "mock-access-token",
        token_type: "bearer",
        refresh_token: "mock-refresh-token",
        user: newUser
      })
    };
  }

  if (path === "/auth/logout" && method === "POST") {
    mockCurrentUser = null;
    return { status: 200, ok: true, json: async () => ({ detail: "Logged out" }) };
  }

  if (path === "/auth/refresh" && method === "POST") {
    if (!mockCurrentUser) return { status: 401, ok: false, json: async () => ({ detail: "No refresh token" }) };
    return {
      status: 200,
      ok: true,
      json: async () => ({
        access_token: "mock-access-token",
        token_type: "bearer",
        refresh_token: "mock-refresh-token",
        user: mockCurrentUser
      })
    };
  }

  // --- Dashboard endpoints ---
  if (path === "/dashboard/summary" && method === "GET") {
    if (!mockCurrentUser) return { status: 401, ok: false, json: async () => ({ detail: "Not authenticated" }) };

    if (mockCurrentUser.role === "mentor" || mockCurrentUser.role === "admin") {
      const activeProjectsCount = mockProjects.filter(p => p.mentor_id === mockCurrentUser!.id).length;
      
      const pendingReviewsList = mockSubmissions
        .filter(s => s.status === "submitted")
        .map(s => ({
          id: s.id,
          project_title: mockProjects.find(p => p.id === s.project_id)?.title || "Project",
          student_name: findUser(s.user_id)?.name || "Student",
          submitted_at: s.created_at,
          repo_url: s.repo_url,
          demo_url: s.demo_url
        }));

      return {
        status: 200,
        ok: true,
        json: async () => ({
          role: mockCurrentUser!.role,
          stats: {
            active_projects: activeProjectsCount,
            total_students: mockUsers.filter(u => u.role === "student").length,
            pending_reviews: pendingReviewsList.length,
            approved_certificates: mockCertificates.length
          },
          pending_submissions: pendingReviewsList
        })
      };
    } else {
      // Student Dashboard
      const myTasks = mockSprints
        .flatMap(s => s.tasks)
        .filter(t => t.assigned_to_id === mockCurrentUser!.id);
      
      const completedTasks = myTasks.filter(t => t.status === "done").length;
      const myCerts = mockCertificates.filter(c => c.user_id === mockCurrentUser!.id);

      return {
        status: 200,
        ok: true,
        json: async () => ({
          role: mockCurrentUser!.role,
          stats: {
            active_projects: mockProjects.length, // seed project
            tasks_completed: completedTasks,
            tasks_total: myTasks.length,
            certificates_earned: myCerts.length
          },
          active_tasks: myTasks
            .filter(t => t.status !== "done")
            .map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              project_title: "Distributed E-Commerce API Engine",
              sprint_number: 1
            })),
          certificates: myCerts.map(c => ({
            id: c.id,
            project_title: mockProjects.find(p => p.id === c.project_id)?.title || "Project",
            issued_at: c.issued_at,
            criteria: c.criteria_met
          }))
        })
      };
    }
  }

  // --- Projects CRUD ---
  if (path === "/projects" && method === "GET") {
    return { status: 200, ok: true, json: async () => mockProjects };
  }

  if (path === "/projects" && method === "POST") {
    const { title, description } = body;
    const newProj = {
      id: mockProjects.length + 1,
      title,
      description,
      status: "active",
      mentor_id: mockCurrentUser?.id || 3,
      created_at: new Date().toISOString(),
      mentor: mockCurrentUser || { id: 3, name: "Siddharth Roy" },
      members: [
        { user_id: mockCurrentUser?.id || 3, role: "lead", user: mockCurrentUser || { id: 3, name: "Siddharth Roy" } }
      ]
    };
    mockProjects.push(newProj);
    return { status: 201, ok: true, json: async () => newProj };
  }

  if (path.startsWith("/projects/") && path.endsWith("/join") && method === "POST") {
    const pId = parseInt(path.split("/")[2]);
    const project = mockProjects.find(p => p.id === pId);
    if (!project) return { status: 404, ok: false, json: async () => ({ detail: "Project not found" }) };

    if (!project.members.some(m => m.user_id === mockCurrentUser!.id)) {
      project.members.push({
        user_id: mockCurrentUser!.id,
        role: "contributor",
        user: mockCurrentUser!
      });
    }
    return { status: 200, ok: true, json: async () => project };
  }

  if (path.startsWith("/projects/") && method === "GET") {
    const pId = parseInt(path.split("/")[2]);
    const project = mockProjects.find(p => p.id === pId);
    if (!project) return { status: 404, ok: false, json: async () => ({ detail: "Project not found" }) };
    return { status: 200, ok: true, json: async () => project };
  }

  // --- Sprints ---
  if (path.startsWith("/projects/") && path.endsWith("/sprints") && method === "GET") {
    const pId = parseInt(path.split("/")[2]);
    const projectSprints = mockSprints.filter(s => s.project_id === pId);
    return { status: 200, ok: true, json: async () => projectSprints };
  }

  if (path.startsWith("/projects/") && path.endsWith("/sprints") && method === "POST") {
    const pId = parseInt(path.split("/")[2]);
    const { sprint_number, goal, start_date, end_date } = body;
    const newSprint = {
      id: mockSprints.length + 1,
      project_id: pId,
      sprint_number,
      start_date,
      end_date,
      goal,
      tasks: []
    };
    mockSprints.push(newSprint);
    return { status: 201, ok: true, json: async () => newSprint };
  }

  // --- Tasks ---
  if (path.startsWith("/projects/sprints/") && path.endsWith("/tasks") && method === "POST") {
    const sId = parseInt(path.split("/")[3]);
    const sprint = mockSprints.find(s => s.id === sId);
    if (!sprint) return { status: 404, ok: false, json: async () => ({ detail: "Sprint not found" }) };

    const { title, description, assigned_to_id } = body;
    const assignee = assigned_to_id ? findUser(assigned_to_id) : null;
    const newTask = {
      id: Math.max(0, ...mockSprints.flatMap(s => s.tasks.map(t => t.id))) + 1,
      sprint_id: sId,
      assigned_to_id: assigned_to_id || null,
      title,
      description: description || null,
      status: "todo" as const,
      github_pr_url: null,
      assignee
    };
    sprint.tasks.push(newTask);
    return { status: 201, ok: true, json: async () => newTask };
  }

  if (path.startsWith("/projects/tasks/") && method === "PATCH") {
    const tId = parseInt(path.split("/")[3]);
    let foundTask: any = null;
    
    for (const sprint of mockSprints) {
      const idx = sprint.tasks.findIndex(t => t.id === tId);
      if (idx !== -1) {
        foundTask = sprint.tasks[idx];
        const updateData = body || {};
        if (updateData.status) foundTask.status = updateData.status;
        if (updateData.github_pr_url !== undefined) foundTask.github_pr_url = updateData.github_pr_url;
        break;
      }
    }

    if (!foundTask) return { status: 404, ok: false, json: async () => ({ detail: "Task not found" }) };
    return { status: 200, ok: true, json: async () => foundTask };
  }

  // --- Submissions & Reviews ---
  if (path === "/submissions" && method === "POST") {
    const { project_id, demo_url, repo_url } = body;
    const newSubmission = {
      id: mockSubmissions.length + 1,
      project_id,
      user_id: mockCurrentUser!.id,
      demo_url,
      repo_url,
      reviewed_by_id: null,
      feedback: null,
      status: "submitted",
      created_at: new Date().toISOString()
    };
    mockSubmissions.push(newSubmission);
    return { status: 201, ok: true, json: async () => newSubmission };
  }

  if (path.startsWith("/submissions/") && path.endsWith("/review") && method === "PATCH") {
    const sId = parseInt(path.split("/")[2]);
    const sub = mockSubmissions.find(s => s.id === sId);
    if (!sub) return { status: 404, ok: false, json: async () => ({ detail: "Submission not found" }) };

    const { status, feedback } = body;
    sub.status = status;
    sub.feedback = feedback;
    sub.reviewed_by_id = mockCurrentUser!.id;

    if (status === "approved") {
      const proj = mockProjects.find(p => p.id === sub.project_id);
      const student = findUser(sub.user_id);
      const criteria = {
        student_name: student?.name || "Student",
        project_title: proj?.title || "Project",
        mentor_name: mockCurrentUser!.name,
        demo_url: sub.demo_url,
        repo_url: sub.repo_url,
        approved_at: new Date().toISOString(),
        audit_message: "Verifiable Software Engineering Achievement. This certificate validates actual codebase contributions (GitHub Pull Requests merged, functional demo delivered, and code reviewed by a professional engineering mentor)."
      };

      const newCert = {
        id: mockCertificates.length + 101,
        user_id: sub.user_id,
        project_id: sub.project_id,
        issued_at: new Date().toISOString(),
        criteria_met: criteria
      };
      mockCertificates.push(newCert);
    }

    return { status: 200, ok: true, json: async () => sub };
  }

  // --- Portfolio ---
  if (path === "/portfolio" && method === "GET") {
    const publicSlugs = mockUsers
      .filter(u => u.profile?.is_public)
      .map(u => u.name.toLowerCase().replace(/\s+/g, "-"));
    return { status: 200, ok: true, json: async () => publicSlugs };
  }

  if (path.startsWith("/portfolio/") && method === "GET") {
    const username = path.split("/")[2];
    const user = mockUsers.find(u => u.name.toLowerCase().replace(/\s+/g, "-") === username.toLowerCase() || u.id === parseInt(username));
    if (!user || !user.profile || !user.profile.is_public) {
      return { status: 404, ok: false, json: async () => ({ detail: "Portfolio not found or private" }) };
    }
    
    // Attach certificates dynamically to public user object
    const userCerts = mockCertificates.filter(c => c.user_id === user.id).map(c => ({
      id: c.id,
      project_title: mockProjects.find(p => p.id === c.project_id)?.title || "Project",
      issued_at: c.issued_at,
      criteria: c.criteria_met
    }));

    return { 
      status: 200, 
      ok: true, 
      json: async () => ({
        ...user,
        certificates: userCerts
      }) 
    };
  }

  if (path === "/portfolio/me" && method === "PATCH") {
    if (!mockCurrentUser) return { status: 401, ok: false, json: async () => ({ detail: "Not authenticated" }) };

    mockCurrentUser.profile = {
      ...mockCurrentUser.profile,
      ...body
    };

    // Update in users catalog
    const uIdx = mockUsers.findIndex(u => u.id === mockCurrentUser!.id);
    if (uIdx !== -1) mockUsers[uIdx] = mockCurrentUser;

    return { status: 200, ok: true, json: async () => mockCurrentUser };
  }

  // --- Auth Extensions (forgot password and account updates) ---
  if (path === "/auth/forgot-password" && method === "POST") {
    return {
      status: 200,
      ok: true,
      json: async () => ({ message: "If this email exists in our system, a password reset link has been sent." })
    };
  }

  if (path === "/auth/account" && method === "PATCH") {
    if (!mockCurrentUser) return { status: 401, ok: false, json: async () => ({ detail: "Not authenticated" }) };

    if (body.email) {
      mockCurrentUser.email = body.email;
    }
    // Simulate updating mockCurrentUser in mockUsers catalog
    const uIdx = mockUsers.findIndex(u => u.id === mockCurrentUser!.id);
    if (uIdx !== -1) mockUsers[uIdx] = mockCurrentUser;

    return { status: 200, ok: true, json: async () => ({ status: "success", message: "Account updated successfully." }) };
  }

  // --- Mentor Student Roster ---
  if (path.startsWith("/mentors/") && path.endsWith("/students") && method === "GET") {
    const mentorId = parseInt(path.split("/")[2]);
    const projects = mockProjects.filter(p => p.mentor_id === mentorId);
    const projIds = projects.map(p => p.id);

    const studentsInProjects = mockUsers.filter(u => {
      if (u.role !== "student") return false;
      return mockProjects.some(p => projIds.includes(p.id) && p.members.some(m => m.user_id === u.id));
    });

    const result = studentsInProjects.map(student => {
      const studentProject = projects.find(p => p.members.some(m => m.user_id === student.id));
      const activeSprint = studentProject ? mockSprints.find(s => s.project_id === studentProject.id) : null;
      const inProgressTasks = activeSprint
        ? activeSprint.tasks.filter(t => t.assigned_to_id === student.id && t.status !== "done").length
        : 0;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        college: student.profile?.college || "",
        avatar_url: student.avatar_url,
        project_title: studentProject ? studentProject.title : "None",
        sprint_number: activeSprint ? activeSprint.sprint_number : 1,
        tasks_in_progress: inProgressTasks,
        last_activity_date: new Date().toISOString()
      };
    });

    return { status: 200, ok: true, json: async () => result };
  }

  // --- Contact Submission ---
  if (path === "/contact" && method === "POST") {
    return { 
      status: 200, 
      ok: true, 
      json: async () => ({
        status: "success",
        message: "Logged successfully (Frontend Sandbox Fallback active)"
      }) 
    };
  }

  // --- Live Activity Feed ---
  if (path.startsWith("/activity/recent") && method === "GET") {
    const mockEvents = [
      { id: 1, event_type: "certificate_issued", actor_name: "Rohan Verma", project_title: "Distributed E-Commerce API Engine", created_at: new Date(Date.now() - 3600000).toISOString(), metadata: { mentor_name: "Atul Sharma" } },
      { id: 2, event_type: "submission_approved", actor_name: "Priya Singh", project_title: "Real-Time ML Inference API", created_at: new Date(Date.now() - 7200000).toISOString(), metadata: { mentor_name: "Divakar Singh" } },
      { id: 3, event_type: "project_started", actor_name: "Atul Sharma", project_title: "CoderCorps CLI Toolchain", created_at: new Date(Date.now() - 86400000).toISOString(), metadata: {} },
      { id: 4, event_type: "certificate_issued", actor_name: "Aditya Kumar", project_title: "Async Job Queue System", created_at: new Date(Date.now() - 172800000).toISOString(), metadata: { mentor_name: "Devansh Rathaur" } },
      { id: 5, event_type: "submission_approved", actor_name: "Meera Joshi", project_title: "LLM-Powered Code Review Bot", created_at: new Date(Date.now() - 259200000).toISOString(), metadata: { mentor_name: "Atul Sharma" } }
    ];
    return { status: 200, ok: true, json: async () => mockEvents };
  }

  // --- Public Certificate Details ---
  if (path.startsWith("/certificates/") && method === "GET") {
    const certId = parseInt(path.split("/")[2]);
    const mockCert = {
      id: certId,
      holder_name: "Rohan Verma",
      project_title: "Distributed E-Commerce API Engine",
      issued_at: new Date().toISOString(),
      criteria_met: {
        student_name: "Rohan Verma",
        project_title: "Distributed E-Commerce API Engine",
        mentor_name: "Atul Sharma",
        demo_url: "https://youtube.com/watch?v=mockdemo",
        repo_url: "https://github.com/codercorps/ecommerce-api",
        approved_at: new Date().toISOString(),
        audit_message: "Verifiable Software Engineering Achievement. This certificate validates actual codebase contributions (GitHub Pull Requests merged, functional demo delivered, and code reviewed by a professional engineering mentor)."
      },
      mentor_name: "Atul Sharma"
    };
    return { status: 200, ok: true, json: async () => mockCert };
  }

  return { status: 404, ok: false, json: async () => ({ detail: "Not found" }) };
}
