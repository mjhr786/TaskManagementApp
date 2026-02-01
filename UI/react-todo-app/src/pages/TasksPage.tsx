import { useEffect, useMemo, useRef, useState } from "react";
import { api, GetTasksParams, exportMyTasksExcel, exportAllTasksExcel, triggerDownload, importTasksExcel } from "../api/api";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Tooltip,
  useMediaQuery,
  useTheme,
  ButtonGroup,
  FormControl,
  InputLabel,
  OutlinedInput,
  TextField,
} from "@mui/material";
import TaskForm from "../components/TaskForm";
import TimeLogForm from "../components/TimeLogForm";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { hasRole } from '../auth/auth'
import { useSnackbar } from 'notistack';
import UploadFileIcon from "@mui/icons-material/UploadFile";
import GetAppIcon from "@mui/icons-material/GetApp";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";


export type TaskVm = {
  id: string;
  title: string;
  description?: string;
  createdDate: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours: number;
};

type PagedTasks = {
  items: TaskVm[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function TasksPage() {
  const [paged, setPaged] = useState<PagedTasks>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // format helper
  const fmt = (iso: string) => new Date(iso).toLocaleDateString();

  // filters
  const [status, setStatus] = useState<string>(""); // New | InProgress | Completed | Archived | ''
  const [date, setDate] = useState<string>(""); // YYYY-MM-DD | ''

  // sorting: by date asc/desc
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // pagination
  const PAGE_SIZE = 5;
  const [page, setPage] = useState<number>(1);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<TaskVm | null>(null);
  const [logTask, setLogTask] = useState<TaskVm | null>(null);

  const [todayTotal, setTodayTotal] = useState(0);

  const loadTodayStats = async () => {
    try {
      const res = await api.getTodayTotalHours();
      setTodayTotal(res?.totalHours || 0);
    } catch { /* ignore */ }
  };

  const load = async () => {
    const params: GetTasksParams = {
      page,
      pageSize: PAGE_SIZE,
      sort: "date",
      order: sortOrder,
      date: date || undefined,
      status: (status || undefined) as any,
    };
    try {
      setLoading(true);
      const data = await api.getTasks(params);
      setPaged(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // initial & when filters change
  useEffect(() => {
    setPage(1);
  }, [status, date, sortOrder]);
  useEffect(() => {
    load();
    loadTodayStats();
  }, [page, status, date, sortOrder]);

  const handleCreate = async (payload: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      if (payload.startDate > payload.endDate) {
        setFormError("Start Date cannot be after End Date.");
        return;
      }
      await api.createTask(payload);
      setShowForm(false); // closes dialog -> onExited clears it
      await load();
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  const handleUpdate = async (payload: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!editTask) return;
    try {
      if (payload.startDate > payload.endDate) {
        setFormError("Start Date cannot be after End Date.");
        return;
      }
      await api.updateTask(editTask.id, payload);
      setEditTask(null); // closes dialog -> onExited clears it
      await load();
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete task?")) return;
    try {
      await api.deleteTask(id);
      await load();
      await loadTodayStats();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const handleComplete = async (id: string) => {
    try {
      await api.completeTask(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const handleLogHours = async (hours: number) => {
    if (!logTask) return;
    try {
      await api.logHours(logTask.id, hours);
      setLogTask(null);
      await load();
      await loadTodayStats();
    } catch (e: any) {
      setLogError(e.message);
    }
  };
  const updateStatus = async (
    id: string,
    newStatus: "New" | "InProgress" | "Completed" | "Archived"
  ) => {
    try {
      await api.updateTaskStatus(id, newStatus);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };


  const handleSortChange = (_: any, val: "asc" | "desc" | null) => {
    if (val) setSortOrder(val);
  };

  // status chip color mapping
  const statusChip = (s: string) => {
    console.log("Status Chip", s);
    if (s == "2") return { color: "success", label: "Completed" };
    if (s == "1") return { color: "primary", label: "In Progress" };
    if (s == "3") return { color: "warning", label: "Archived" };
    return { color: "default", label: "New" };
  };

  const handleExportMyTasks = async () => {
    try {
      const blob = await exportMyTasksExcel({
        fromDate: '',
        toDate: '',
        status
      });
      const name = `MyTasks_${new Date().toISOString().slice(0, 10)}.xlsx`;
      triggerDownload(blob, name);
    } catch (e: any) {
      setError(e.message || 'Export failed');
    }
  };

  const handleExportAll = async () => {
    try {
      const blob = await exportAllTasksExcel({
        fromDate: '',
        toDate: '',
        status
      });
      const name = `AllTasks_${new Date().toISOString().slice(0, 10)}.xlsx`;
      triggerDownload(blob, name);
    } catch (e: any) {
      setError(e.message || 'Export failed');
    }
  };


  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importTasksExcel(file);
      if (result.errors.length > 0) {
        enqueueSnackbar(`Import completed with errors: ${result.imported} imported, ${result.skipped} skipped. First error: ${result.errors[0].message}`, { variant: 'error' });
      } else {
        enqueueSnackbar(`Import successful: ${result.imported} imported, ${result.skipped} skipped`, { variant: 'success' });
      }
      await load(); // reload tasks
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Import failed', { variant: 'error' });
    } finally {
      e.target.value = ''; // clear input
    }
  };


  return (
    <Box className="flex-col gap-16">
      {/* Filters + toolbar */}
      <Card className="glass-card section" elevation={0}>
        <CardContent>
          {/* HEADER — tidy responsive layout */}
          <Stack spacing={2}>
            {/* ROW 1: Title + Primary Actions */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              {/* Left: Title */}
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '8px',
                    p: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  <ChecklistIcon sx={{ color: "white", fontSize: 20 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  My Tasks
                </Typography>
              </Stack>

              {/* Right: Primary actions */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
                sx={{ '& > button': { flex: { xs: 1, sm: 'none' } } }}
              >
                <Button
                  variant="contained"
                  size={isXs ? "medium" : "small"}
                  startIcon={<AddIcon />}
                  onClick={() => setShowForm(true)}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                    textTransform: 'none'
                  }}
                >
                  Add Task
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<GetAppIcon />}
                  onClick={handleExportMyTasks}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Export
                </Button>

                {hasRole("Admin") && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<GetAppIcon />}
                    onClick={handleExportAll}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Export All (Admin)
                  </Button>
                )}

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileIcon />}
                  onClick={handleImportClick}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Import
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx"
                  style={{ display: "none" }}
                  onChange={handleImportChange}
                />
              </Stack>
            </Stack>

            <Divider sx={{ opacity: 0.6 }} />

            {/* ROW 2: Filters */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Filters & Sorting
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <TextField
                  size="small"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Select
                  size="small"
                  value={status}
                  displayEmpty
                  onChange={(e) => setStatus(e.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 140 }, borderRadius: 2 }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="InProgress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>

                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={sortOrder}
                  onChange={(_, val) => val && setSortOrder(val)}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    '& .MuiToggleButton-root': { flex: 1, textTransform: 'none', borderRadius: 2 }
                  }}
                >
                  <ToggleButton value="asc">Date ↑</ToggleButton>
                  <ToggleButton value="desc">Date ↓</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            {/* Error Message */}
            {error && (
              <Alert sx={{ borderRadius: 2 }} severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tasks list */}
      <Stack spacing={2}>
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Box key={i} className="task-band">
              <div className="task-header">
                <Skeleton variant="text" width={220} height={28} />
                <Skeleton variant="rectangular" width={120} height={28} />
              </div>
              <div className="task-body">
                <Skeleton variant="text" width="80%" />
              </div>
            </Box>
          ))
        ) : (
          <>
            {paged.items.map((t) => {
              const chip = statusChip(t.status);
              return (
                <Card
                  key={t.id}
                  className="glass-card"
                  elevation={0}
                  sx={{ p: 2, position: 'relative', overflow: 'visible' }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={2}
                    justifyContent="space-between"
                  >
                    {/* Left: Title & Status */}
                    <Stack spacing={1} sx={{ flex: 1, width: '100%' }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: chip.color === 'default' ? 'grey.400' : `${chip.color}.main`
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: '#334155' }}>
                          {t.title}
                        </Typography>
                        <Chip
                          label={chip.label}
                          color={chip.color as any}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      </Stack>

                      {/* Dates & Hours Mobile Stack */}
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={2}
                        sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonthIcon fontSize="inherit" sx={{ opacity: 0.7 }} />
                          <span>{fmt(t.startDate)} - {fmt(t.endDate)}</span>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon fontSize="inherit" sx={{ opacity: 0.7 }} />
                          <Typography component="span" fontWeight={500} color="primary.main">
                            {t.totalHours?.toFixed(1) || '0.0'}h
                          </Typography>
                          <span>logged</span>
                        </Box>
                      </Stack>

                      {/* Description */}
                      {t.description && (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {t.description}
                        </Typography>
                      )}
                    </Stack>

                    {/* Right: Actions */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        width: { xs: '100%', md: 'auto' },
                        justifyContent: { xs: 'space-between', md: 'flex-end' },
                        pt: { xs: 2, md: 0 },
                        borderTop: { xs: '1px solid #f1f5f9', md: 'none' }
                      }}
                    >
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={t.status}
                        onChange={(_, val) => val && updateStatus(t.id, val)}
                        sx={{ mr: 'auto' }}
                      >
                        {/* Just show status switcher as icon buttons on mobile if space is tight, or keep standard */}
                      </ToggleButtonGroup>

                      <Select
                        size="small"
                        value={t.status}
                        onChange={(e) =>
                          updateStatus(
                            t.id,
                            e.target.value as any
                          )
                        }
                        sx={{
                          minWidth: 100,
                          height: 32,
                          fontSize: '0.875rem',
                          mr: 1,
                          bgcolor: 'background.paper'
                        }}
                      >
                        <MenuItem value="0">New</MenuItem>
                        <MenuItem value="1">In Progress</MenuItem>
                        <MenuItem value="2">Completed</MenuItem>
                        <MenuItem value="3">Archived</MenuItem>
                      </Select>

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Log Hours">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setLogTask(t)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <AccessTimeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => setEditTask(t)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark Completed">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleComplete(t.id)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(t.id)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}
          </>
        )}

        {paged.items.length === 0 && !loading && (
          <div className="empty-state">
            <Typography variant="h6">No tasks found</Typography>
            <Typography variant="body2">
              Try changing filters or adding a new task.
            </Typography>
          </div>
        )}

        {/* Pagination */}
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Pagination
            count={paged.totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="medium"
            shape="rounded"
          />
        </Stack>
      </Stack>

      {/* Summary footer */}
      <Card className="glass-card section" elevation={0}>
        <CardContent>
          <Typography variant="body2" sx={{ color: "#334155" }}>
            Today’s total hours: <strong>{todayTotal.toFixed(2)}</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* Modals */}
      <TaskForm
        open={showForm}
        onClose={() => { setShowForm(false); setFormError(null); }}
        onSave={handleCreate}
        error={formError}
      />

      <TaskForm
        open={!!editTask}
        onClose={() => { setEditTask(null); setFormError(null); }}
        initial={
          editTask
            ? {
              title: editTask.title,
              description: editTask.description,
              startDate: editTask.startDate,
              endDate: editTask.endDate,
            }
            : undefined
        }
        onSave={handleUpdate}
        error={formError}
      />

      <TimeLogForm
        open={!!logTask}
        onClose={() => setLogTask(null)}
        onSave={handleLogHours}
        error={logError}
      />
    </Box>
  );
}

function TextFieldSmall(props: any) {
  const { label, value, onChange, type } = props;
  return (
    <input
      aria-label={label}
      value={value}
      onChange={onChange}
      type={type}
      style={{
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #cbd5e1",
      }}
    />
  );
}
