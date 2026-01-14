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
  }, [page, status, date, sortOrder]);

  const handleCreate = async (payload: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      if(payload.startDate > payload.endDate) {
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
      if(payload.startDate > payload.endDate) {
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

  const totalToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return paged.items
      .filter((t) => t.startDate === todayStr)
      .reduce((sum, t) => sum + (t.totalHours || 0), 0);
  }, [paged.items]);

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
      const name = `MyTasks_${new Date().toISOString().slice(0,10)}.xlsx`;
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
      const name = `AllTasks_${new Date().toISOString().slice(0,10)}.xlsx`;
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
      <Card className="card section">
        <CardContent>
          

{/* HEADER — tidy two-row layout */}
<Stack spacing={1.5}>
  {/* ROW 1: Title + Primary Actions */}
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    flexWrap="wrap"
    rowGap={1}
    columnGap={2}
  >
    {/* Left: Title */}
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <ChecklistIcon fontSize="small" sx={{ color: "text.primary" }} />
      <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: 0.2 }}>
        My Tasks
      </Typography>
    </Stack>

    {/* Right: Primary actions */}
    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={1}>
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setShowForm(true)}
      >
        Add Task
      </Button>

      <Button
        variant="outlined"
        size="small"
        startIcon={<GetAppIcon />}
        onClick={handleExportMyTasks}
      >
        Export to Excel
      </Button>

      {hasRole("Admin") && (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<GetAppIcon />}
          onClick={handleExportAll}
        >
          Export All (Admin)
        </Button>
      )}

      <Button
        variant="outlined"
        size="small"
        startIcon={<UploadFileIcon />}
        onClick={handleImportClick}
      >
        Import (.xlsx)
      </Button>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={handleImportChange}
      />
    </Stack>
  </Stack>

  {/* Optional subtle divider */}
  <Divider sx={{ my: 0.5 }} />

  
{/* ROW 2: Filters — aligned to the right */}
<Stack
  direction="row"
  alignItems="center"
  spacing={1.5}
  flexWrap="wrap"
  rowGap={1}
  sx={{
    width: '100%',
  }}
  justifyContent="flex-end"
>
  {/* Optional spacer keeps Filters label at right while allowing wrap on small screens */}
  <Box sx={{ flexGrow: 1 }} />

  <Typography
    variant="body2"
    sx={{ color: 'text.secondary', fontWeight: 600, mr: 1 }}
  >
    Filters
  </Typography>

  {/* Date field */}
  <FormControl size="small" sx={{ minWidth: 180 }}>
    <TextField
      size="small"
      label="Date"
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      InputLabelProps={{ shrink: true }}
    />
  </FormControl>

  {/* Status field */}
  <FormControl size="small" sx={{ minWidth: 160 }}>
    <InputLabel id="tasks-status-label">Status</InputLabel>
    <Select
      labelId="tasks-status-label"
      value={status}
      label="Status"
      onChange={(e) => setStatus(e.target.value)}
    >
      <MenuItem value="">
        <em>All</em>
      </MenuItem>
      <MenuItem value="New">New</MenuItem>
      <MenuItem value="InProgress">In Progress</MenuItem>
      <MenuItem value="Completed">Completed</MenuItem>
      <MenuItem value="Archived">Archived</MenuItem>
    </Select>
  </FormControl>

  {/* Sort segmented control */}
  <ToggleButtonGroup
    size="small"
    exclusive
    value={sortOrder}
    onChange={(_, val) => val && setSortOrder(val)}
    sx={{
      '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5 },
    }}
  >
    <ToggleButton value="asc">Sort: Date ↑</ToggleButton>
    <ToggleButton value="desc">Sort: Date ↓</ToggleButton>
  </ToggleButtonGroup>
</Stack>


  {/* Error below header */}
  {error && (
    <Alert sx={{ mt: 1 }} severity="error">
      {error}
    </Alert>
  )}
</Stack>

        </CardContent>
      </Card>

      {/* Tasks list */}
      <Card className="card section">
        <CardContent>
          {loading ? (
            <Stack spacing={2}>
              {[...Array(3)].map((_, i) => (
                <Box key={i} className="task-band">
                  <div className="task-header">
                    <Skeleton variant="text" width={220} height={28} />
                    <Skeleton variant="rectangular" width={120} height={28} />
                    <Skeleton variant="rectangular" width={220} height={28} />
                  </div>
                  <div className="task-body">
                    <Skeleton variant="text" width="80%" />
                  </div>
                </Box>
              ))}
            </Stack>
          ) : (
            <>
              <Stack spacing={2}>
                {paged.items.map((t) => {
                  const chip = statusChip(t.status);
                  return (
                    <Card
                      key={t.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        justifyContent="space-between"
                      >
                        {/* Left: Title & Status */}
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <AssignmentIcon
                            fontSize="small"
                            sx={{ color: "primary.main" }}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {t.title}
                          </Typography>
                          <Chip
                            label={chip.label}
                            color={chip.color as any}
                            size="small"
                          />
                        </Stack>
                        {/* Right: Actions */}
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Tooltip title="Log Hours">
                            <IconButton
                              color="primary"
                              onClick={() => setLogTask(t)}
                            >
                              <AccessTimeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => setEditTask(t)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mark Completed">
                            <IconButton
                              color="success"
                              onClick={() => handleComplete(t.id)}
                            >
                              <DoneIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(t.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          <Select
                            size="small"
                            value={t.status}
                            onChange={(e) =>
                              updateStatus(
                                t.id,
                                e.target.value as
                                  | "New"
                                  | "InProgress"
                                  | "Completed"
                                  | "Archived"
                              )
                            }
                            sx={{ minWidth: 110 }}
                          >
                            <MenuItem value="0">New</MenuItem>
                            <MenuItem value="1">In Progress</MenuItem>
                            <MenuItem value="2">Completed</MenuItem>
                            <MenuItem value="3">Archived</MenuItem>
                          </Select>
                        </Stack>
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      {/* Second row: Dates & Hours */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={3}
                        sx={{ mb: t.description ? 1 : 0 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          <CalendarMonthIcon
                            fontSize="small"
                            sx={{ mr: 0.5, verticalAlign: "middle" }}
                          />
                          Created-{fmt(t.createdDate.slice(0, 10))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <CalendarMonthIcon
                            fontSize="small"
                            sx={{ mr: 0.5, verticalAlign: "middle" }}
                          />
                          from-{fmt(t.startDate.slice(0, 10))} to-{fmt(t.endDate.slice(0, 10) )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <AccessTimeIcon
                            fontSize="small"
                            sx={{ mr: 0.5, verticalAlign: "middle" }}
                          />
                          {t.totalHours?.toFixed(2)} hrs logged
                        </Typography>
                      </Stack>
                      {/* Description */}
                      {t.description && (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", mt: 0.5 }}
                        >
                          {t.description}
                        </Typography>
                      )}
                    </Card>
                  );
                })}
              </Stack>

              {paged.items.length === 0 && (
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
                  size="small"
                />
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary footer */}
      <Card className="card section">
        <CardContent>
          <Typography variant="body2" sx={{ color: "#334155" }}>
            Today’s total hours: <strong>{totalToday.toFixed(2)}</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* Modals */}
      <TaskForm
        open={showForm}
        onClose={() => {setShowForm(false); setFormError(null); }}
        onSave={handleCreate}
        error={formError}
      />

      <TaskForm
        open={!!editTask}
        onClose={() => {setEditTask(null); setFormError(null); }}
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
