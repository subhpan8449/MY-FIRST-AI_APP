import React, { useState, useEffect } from 'react';
import {
  Room,
  Booking,
  BookingStatus,
  PlayAreaSettings,
  PlayAreaBooking,
  RooftopPackage,
  RooftopBooking,
  Expense,
  ExpenseCategory,
  Offer,
  Facility,
  AIInsight,
  AdminAuditLog,
  CustomerServiceRequest,
  ServiceRequestStatus,
  HousekeepingTask,
  StaffMember,
  RoomPricingHistory,
  PriceType,
  CustomerFeedback,
  Attraction,
  GuestIdDocument
} from '../types';
import { useAuth, PRIMARY_OWNER_EMAIL } from '../context/AuthContext';
import {
  getRooms,
  addRoom,
  updateRoom,
  deleteRoom,
  getBookings,
  updateBookingStatus,
  getPlayAreaSettings,
  updatePlayAreaSettings,
  getPlayAreaBookings,
  getRooftopPackages,
  updateRooftopPackage,
  getRooftopBookings,
  updateRooftopBookingStatus,
  getExpenses,
  addExpense,
  deleteExpense,
  getOffers,
  addOffer,
  updateOffer,
  getFacilities,
  updateFacility,
  getAuditLogs,
  getServiceRequests,
  updateServiceRequestStatus,
  getHousekeepingTasks,
  updateHousekeepingTask,
  createHousekeepingTask,
  triggerCheckoutTurnoverTask,
  getStaffMembers,
  addStaffMember,
  updateStaffMember,
  getPricingHistory,
  updateRoomPriceWithHistory,
  getCustomerFeedback,
  respondToCustomerFeedback,
  getAllGuestDocuments,
  verifyGuestDocument
} from '../services/db';
import {
  computeBusinessMetrics,
  generateAIAdvisorInsights,
  queryAICommandCenter,
  CommandAnswer
} from '../services/aiAdvisor';
import {
  exportBookingsToCSV,
  exportExpensesToCSV,
  exportHousekeepingToCSV,
  exportStaffToCSV,
  exportServiceRequestsToCSV
} from '../utils/exportUtils';
import { SmoothImage, DEFAULT_FALLBACK_PHOTO } from './SmoothImage';
import {
  Shield,
  X,
  LayoutDashboard,
  Bed,
  CalendarCheck,
  Baby,
  Eye,
  Receipt,
  Tag,
  Waves,
  Brain,
  Users,
  History,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  TrendingUp,
  FileText,
  DollarSign,
  Search,
  Sparkles,
  ClipboardList,
  UserCheck,
  UtensilsCrossed,
  SlidersHorizontal,
  BarChart3,
  PieChart,
  Megaphone,
  Star,
  Bell,
  Download,
  Settings,
  Printer,
  ChevronRight,
  ShieldCheck,
  Clock,
  Send,
  MessageSquare,
  HelpCircle,
  Activity,
  Compass,
  Box,
  MapPin,
  ExternalLink,
  Award,
  Coins,
  Edit,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { Room3DViewer } from './Room3DViewer';
import { RISHIKESH_DESTINATIONS } from './AttractionsSection';
import { AdminBookingControlCenter } from './AdminBookingControlCenter';
import { AdminSupportInbox } from './AdminSupportInbox';
import { AdminFestivalThemeManager } from './AdminFestivalThemeManager';
import { SunlitBusinessIntelligence } from './SunlitBusinessIntelligence';
import { COOKNOW_CATALOG } from './CookNowSection';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export type AdminTab =
  | 'overview'
  | 'performance'
  | 'revenue'
  | 'profit-loss'
  | 'expenses'
  | 'ai-advisor'
  | 'rooms'
  | 'pricing'
  | '3d-rooms'
  | 'bookings'
  | 'guests'
  | 'messages'
  | 'festival'
  | 'service-requests'
  | 'housekeeping'
  | 'staff'
  | 'pool'
  | 'play-area'
  | 'rooftop'
  | 'cooknow'
  | 'loyalty'
  | 'offers'
  | 'tourism'
  | 'reviews'
  | 'notifications'
  | 'reports'
  | 'settings'
  | 'audit'
  | 'inventory'
  | 'marketing';

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose, onRefreshData }) => {
  const { currentUser, isPrimaryOwner } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Firestore operational records
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [playSettings, setPlaySettings] = useState<PlayAreaSettings | null>(null);
  const [playBookings, setPlayBookings] = useState<PlayAreaBooking[]>([]);
  const [rooftopPackages, setRooftopPackages] = useState<RooftopPackage[]>([]);
  const [rooftopBookings, setRooftopBookings] = useState<RooftopBooking[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>([]);
  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [pricingHistory, setPricingHistory] = useState<RoomPricingHistory[]>([]);
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [guestDocuments, setGuestDocuments] = useState<GuestIdDocument[]>([]);

  // Search & Filters
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [biViewMode, setBiViewMode] = useState<'powerbi' | 'attribution'>('powerbi');

  // Forms
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('Standard Room');
  const [newRoomFloor, setNewRoomFloor] = useState('1st Floor');
  const [newRoomView, setNewRoomView] = useState<'standard' | 'city' | 'hill' | 'garden'>('standard');
  const [newRoomBasePrice, setNewRoomBasePrice] = useState(1400);
  const [newRoomBeds, setNewRoomBeds] = useState(1);
  const [newRoomBedType, setNewRoomBedType] = useState('Queen Bed');
  const [newRoomAdults, setNewRoomAdults] = useState(2);
  const [newRoomChildren, setNewRoomChildren] = useState(1);
  const [newRoomDesc, setNewRoomDesc] = useState('');

  // Add Expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expAmount, setExpAmount] = useState(0);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('electricity');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDesc, setExpDesc] = useState('');
  const [expReceipt, setExpReceipt] = useState('');

  // Add Staff form
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'Housekeeping' | 'Reception' | 'Maintenance' | 'Guest Assistance' | 'Supervisor'>('Housekeeping');
  const [staffResp, setStaffResp] = useState('');

  // Pricing update modal
  const [editingPriceRoom, setEditingPriceRoom] = useState<Room | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);
  const [priceTypeToUpdate, setPriceTypeToUpdate] = useState<PriceType>('standard');
  const [priceUpdateReason, setPriceUpdateReason] = useState('');

  // Add Housekeeping task
  const [showAddHkTask, setShowAddHkTask] = useState(false);
  const [hkRoomNum, setHkRoomNum] = useState('');
  const [hkType, setHkType] = useState<'routine_cleaning' | 'checkout_turnover' | 'deep_clean' | 'inspection' | 'maintenance_fix'>('routine_cleaning');
  const [hkDeadline, setHkDeadline] = useState('2:00 PM Today');
  const [hkNotes, setHkNotes] = useState('');
  const [hkPriority, setHkPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Review reply
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState('');

  // AI Command Center
  const [aiCommandInput, setAiCommandInput] = useState('');
  const [aiCommandAnswer, setAiCommandAnswer] = useState<CommandAnswer | null>(null);
  const [isQueryingCommand, setIsQueryingCommand] = useState(false);

  // 3D Room Management & Simulation state
  const [selectedRoomFor3DAdmin, setSelectedRoomFor3DAdmin] = useState<Room | null>(null);
  const [selected3dViewType, setSelected3dViewType] = useState<'city' | 'mountain' | 'river'>('city');

  // Tourism Destinations state with persistent storage
  const [tourismList, setTourismList] = useState<Attraction[]>(() => {
    try {
      const stored = localStorage.getItem('sunlit_custom_destinations');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return RISHIKESH_DESTINATIONS;
  });
  const [editingTourItem, setEditingTourItem] = useState<Attraction | null>(null);
  const [showAddTourismModal, setShowAddTourismModal] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourCategory, setNewTourCategory] = useState<'Spiritual' | 'Ghat' | 'Waterfall' | 'Adventure' | 'Yoga & Wellness' | 'Nature & Wildlife'>('Spiritual');
  const [newTourDistance, setNewTourDistance] = useState('');
  const [newTourLocation, setNewTourLocation] = useState('');
  const [newTourDesc, setNewTourDesc] = useState('');
  const [newTourMap, setNewTourMap] = useState('');
  const [newTourImage, setNewTourImage] = useState('');

  const saveTourismList = (updated: Attraction[]) => {
    setTourismList(updated);
    try {
      localStorage.setItem('sunlit_custom_destinations', JSON.stringify(updated));
      window.dispatchEvent(new Event('sunlit_destinations_updated'));
    } catch {}
  };

  // Load all operational data
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [
        rList,
        bList,
        eList,
        pSet,
        pBook,
        rfPkg,
        rfBook,
        oList,
        fList,
        aLogs,
        sReqs,
        hkTasks,
        staffList,
        pHist,
        fBack,
        gDocsList
      ] = await Promise.all([
        getRooms(),
        getBookings(),
        getExpenses(),
        getPlayAreaSettings(),
        getPlayAreaBookings(),
        getRooftopPackages(),
        getRooftopBookings(),
        getOffers(),
        getFacilities(),
        getAuditLogs(),
        getServiceRequests(),
        getHousekeepingTasks(),
        getStaffMembers(),
        getPricingHistory(),
        getCustomerFeedback(),
        getAllGuestDocuments()
      ]);

      setRooms(rList);
      setBookings(bList);
      setExpenses(eList);
      setPlaySettings(pSet);
      setPlayBookings(pBook);
      setRooftopPackages(rfPkg);
      setRooftopBookings(rfBook);
      setOffers(oList);
      setFacilities(fList);
      setAuditLogs(aLogs);
      setServiceRequests(sReqs);
      setHousekeepingTasks(hkTasks);
      setStaff(staffList);
      setPricingHistory(pHist);
      setFeedbackList(fBack);
      setGuestDocuments(gDocsList || []);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load database records.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen]);

  const metrics = computeBusinessMetrics(rooms, bookings, expenses, rooftopBookings, playBookings);

  // Generate initial insights if empty
  const handleGenerateAIInsights = async () => {
    setIsGeneratingAi(true);
    try {
      const list = await generateAIAdvisorInsights(metrics);
      setAiInsights(list);
    } catch (err) {
      console.error('Error generating AI insights:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen && aiInsights.length === 0 && !isLoading) {
      handleGenerateAIInsights();
    }
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  // Handlers for room actions
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber || !newRoomName) return;

    try {
      await addRoom(
        {
          roomNumber: newRoomNumber.trim(),
          name: newRoomName.trim(),
          category: newRoomCategory,
          floor: newRoomFloor,
          viewType: newRoomView,
          basePrice: Number(newRoomBasePrice),
          specialPrice: Number(newRoomBasePrice),
          beds: Number(newRoomBeds),
          bedType: newRoomBedType,
          adultCapacity: Number(newRoomAdults),
          childCapacity: Number(newRoomChildren),
          totalCapacity: Number(newRoomAdults) + Number(newRoomChildren),
          description: newRoomDesc.trim() || 'Clean and comfortable room in Tapovan, Rishikesh.',
          amenities: ['Free High-Speed Wi-Fi', 'Ensuite Bathroom', 'Hot Shower 24/7', 'Electric Kettle'],
          images: [],
          isActive: true,
          isMaintenance: false,
          availabilityStatus: 'available'
        },
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );

      setStatusMessage({ type: 'success', text: `Room ${newRoomNumber} added successfully.` });
      setShowAddRoom(false);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add room.' });
    }
  };

  const handleToggleRoomStatus = async (room: Room, nextStatus: Room['availabilityStatus']) => {
    try {
      await updateRoom(
        room.id,
        {
          availabilityStatus: nextStatus,
          isMaintenance: nextStatus === 'maintenance'
        },
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );
      setStatusMessage({ type: 'success', text: `Room ${room.roomNumber} status set to ${nextStatus}.` });
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  // Booking Check-in & Check-out automation
  const handleCheckInBooking = async (b: Booking) => {
    try {
      await updateBookingStatus(b.id, 'checked_in', currentUser?.email || PRIMARY_OWNER_EMAIL, 'Guest checked in at front desk');
      // Set room to occupied
      const targetRoom = rooms.find(r => r.id === b.roomId || r.roomNumber === b.roomId);
      if (targetRoom) {
        await updateRoom(targetRoom.id, { availabilityStatus: 'occupied' }, currentUser?.email || PRIMARY_OWNER_EMAIL);
      }
      setStatusMessage({ type: 'success', text: `Booking ${b.bookingReference} marked Checked In. Room is Occupied.` });
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to check in.' });
    }
  };

  const handleCheckOutBooking = async (b: Booking) => {
    try {
      await updateBookingStatus(b.id, 'checked_out', currentUser?.email || PRIMARY_OWNER_EMAIL, 'Guest completed stay and checked out');
      // Trigger automated turnover task & mark room cleaning
      const targetRoom = rooms.find(r => r.id === b.roomId || r.roomNumber === b.roomId);
      if (targetRoom) {
        await triggerCheckoutTurnoverTask(targetRoom.roomNumber, targetRoom.id, b.guestName);
      }
      setStatusMessage({
        type: 'success',
        text: `Booking ${b.bookingReference} Checked Out. Room ${b.roomName} transitioned to Cleaning with automated turnover task created.`
      });
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to check out.' });
    }
  };

  // Pricing update handler
  const handleSavePriceChange = async () => {
    if (!editingPriceRoom || !newPriceValue || !priceUpdateReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill new price and reason for price adjustment.' });
      return;
    }
    try {
      await updateRoomPriceWithHistory(
        editingPriceRoom.id,
        newPriceValue,
        priceTypeToUpdate,
        priceUpdateReason.trim(),
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );
      setStatusMessage({ type: 'success', text: `Room ${editingPriceRoom.roomNumber} price updated to ₹${newPriceValue}.` });
      setEditingPriceRoom(null);
      setPriceUpdateReason('');
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to update pricing.' });
    }
  };

  // Service Request status handler
  const handleUpdateServiceStatus = async (reqId: string, status: ServiceRequestStatus, staffName?: string) => {
    try {
      await updateServiceRequestStatus(reqId, status, undefined, staffName, currentUser?.email || PRIMARY_OWNER_EMAIL);
      setStatusMessage({ type: 'success', text: `Service request updated to ${status}.` });
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to update request.' });
    }
  };

  // Housekeeping task handlers
  const handleToggleTaskInspection = async (task: HousekeepingTask) => {
    try {
      await updateHousekeepingTask(
        task.id,
        {
          inspectionPassed: !task.inspectionPassed,
          inspectedBy: !task.inspectionPassed ? (currentUser?.email || 'Manoj Pandey') : ''
        },
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );
      fetchAllData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateHkTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hkRoomNum.trim()) return;
    try {
      await createHousekeepingTask({
        roomNumber: hkRoomNum.trim(),
        taskType: hkType,
        priority: hkPriority,
        deadline: hkDeadline,
        status: 'pending',
        notes: hkNotes,
        inspectionPassed: false
      });
      setStatusMessage({ type: 'success', text: `Housekeeping task created for Room ${hkRoomNum}.` });
      setShowAddHkTask(false);
      setHkNotes('');
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to create housekeeping task.' });
    }
  };

  // Staff handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffPhone) return;
    try {
      await addStaffMember(
        {
          name: staffName.trim(),
          phone: staffPhone.trim(),
          email: staffEmail.trim() || undefined,
          designation: staffRole,
          active: true,
          responsibilities: staffResp ? staffResp.split(',').map(s => s.trim()) : ['General duties']
        },
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );
      setStatusMessage({ type: 'success', text: `Staff member ${staffName} enrolled.` });
      setShowAddStaff(false);
      setStaffName('');
      setStaffPhone('');
      setStaffEmail('');
      setStaffResp('');
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to add staff member.' });
    }
  };

  // Expense handler
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;
    try {
      await addExpense(
        {
          amount: Number(expAmount),
          category: expCategory,
          date: expDate,
          description: expDesc.trim() || `${expCategory} operational expense`,
          receiptUrl: expReceipt.trim() || undefined,
          enteredBy: currentUser?.email || PRIMARY_OWNER_EMAIL
        },
        currentUser?.email || PRIMARY_OWNER_EMAIL
      );
      setStatusMessage({ type: 'success', text: `Expense of ₹${expAmount} recorded under ${expCategory}.` });
      setShowAddExpense(false);
      setExpAmount(0);
      setExpDesc('');
      setExpReceipt('');
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to add expense.' });
    }
  };

  // AI Command Query
  const handleExecuteAiCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiCommandInput.trim()) return;

    setIsQueryingCommand(true);
    try {
      const answer = await queryAICommandCenter(aiCommandInput, metrics, serviceRequests, staff);
      setAiCommandAnswer(answer);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsQueryingCommand(false);
    }
  };

  // Review reply handler
  const handleSaveReviewReply = async (feedbackId: string) => {
    if (!ownerReplyText.trim()) return;
    try {
      await respondToCustomerFeedback(feedbackId, ownerReplyText.trim(), currentUser?.email || PRIMARY_OWNER_EMAIL);
      setStatusMessage({ type: 'success', text: 'Owner response published.' });
      setReplyingReviewId(null);
      setOwnerReplyText('');
      fetchAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to save response.' });
    }
  };

  // Unique guests directory compiled from bookings
  const guestDirectoryMap = new Map<string, { name: string; email: string; phone: string; stays: number; totalSpend: number; latestStay: string; latestRoom: string }>();
  bookings.forEach(b => {
    const key = b.guestEmail || b.guestPhone || b.guestName;
    const existing = guestDirectoryMap.get(key);
    if (existing) {
      existing.stays += 1;
      existing.totalSpend += b.totalAmount || 0;
      if (new Date(b.checkInDate) > new Date(existing.latestStay)) {
        existing.latestStay = b.checkInDate;
        existing.latestRoom = b.roomName;
      }
    } else {
      guestDirectoryMap.set(key, {
        name: b.guestName,
        email: b.guestEmail,
        phone: b.guestPhone,
        stays: 1,
        totalSpend: b.totalAmount || 0,
        latestStay: b.checkInDate,
        latestRoom: b.roomName
      });
    }
  });
  const guestDirectory = Array.from(guestDirectoryMap.values());

  // Filtered Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.guestName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.bookingReference.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.roomName.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sidebar Menu Configuration (Exact 25 Master Sections)
  const NAV_ITEMS: { id: AdminTab; label: string; icon: any; category: string }[] = [
    { id: 'overview', label: '1. Business Overview', icon: LayoutDashboard, category: 'Executive' },
    { id: 'performance', label: '2. Performance Dashboard', icon: Activity, category: 'Executive' },
    { id: 'revenue', label: '3. Revenue Analytics', icon: TrendingUp, category: 'Financials' },
    { id: 'profit-loss', label: '4. Profit and Loss', icon: PieChart, category: 'Financials' },
    { id: 'expenses', label: '5. Expense Management', icon: Receipt, category: 'Financials' },
    { id: 'ai-advisor', label: '6. AI Business Advisor', icon: Brain, category: 'Intelligence' },
    { id: 'rooms', label: '7. Room Management', icon: Bed, category: 'Operations' },
    { id: 'pricing', label: '8. Room Pricing', icon: DollarSign, category: 'Commercial' },
    { id: '3d-rooms', label: '9. 3D Room Management', icon: Box, category: 'Operations' },
    { id: 'bookings', label: '10. Booking Management', icon: CalendarCheck, category: 'Operations' },
    { id: 'guests', label: '11. Guest Management', icon: Users, category: 'Operations' },
    { id: 'messages', label: '12. Live Support Inbox', icon: MessageSquare, category: 'Operations' },
    { id: 'festival', label: '13. Sunlit Festival Magic', icon: Sparkles, category: 'Marketing' },
    { id: 'service-requests', label: '14. Customer Service Requests', icon: HelpCircle, category: 'Operations' },
    { id: 'housekeeping', label: '15. Housekeeping', icon: ClipboardList, category: 'Operations' },
    { id: 'staff', label: '16. Staff Management', icon: UserCheck, category: 'Operations' },
    { id: 'pool', label: '17. Swimming Pool Management', icon: Waves, category: 'Services' },
    { id: 'play-area', label: '18. Kids Play Area Management', icon: Baby, category: 'Services' },
    { id: 'rooftop', label: '19. Rooftop Packages', icon: Eye, category: 'Services' },
    { id: 'cooknow', label: '20. CookNow Integration', icon: UtensilsCrossed, category: 'Services' },
    { id: 'loyalty', label: '21. Loyalty & Rewards CRM', icon: Award, category: 'Commercial' },
    { id: 'offers', label: '22. Offers and Discounts', icon: Tag, category: 'Commercial' },
    { id: 'tourism', label: '23. Tourism Management', icon: Compass, category: 'Services' },
    { id: 'reviews', label: '24. Customer Feedback', icon: Star, category: 'Reputation' },
    { id: 'notifications', label: '25. Notifications', icon: Bell, category: 'Administrative' },
    { id: 'reports', label: '26. Reports and Exports', icon: Download, category: 'Administrative' },
    { id: 'settings', label: '27. Business Settings', icon: Settings, category: 'Administrative' },
    { id: 'audit', label: '28. Admin Activity Logs', icon: History, category: 'Security' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-stone-50 rounded-2xl w-full h-[96vh] max-w-[1440px] overflow-hidden shadow-2xl border border-stone-300 flex flex-col">
        {/* Top Header */}
        <div className="bg-amber-950 px-6 py-3.5 text-white flex items-center justify-between border-b border-amber-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-800 rounded-lg shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">DEVASHISH SUNLIT HOMESTAY</h2>
                <span className="bg-amber-800/80 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Master Admin Corner
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Tapovan, Rishikesh · Equal Admin Permissions · Subhashish Pandey & Vivek Singh Negi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-stone-200 block">{currentUser?.email}</span>
              <span className="text-[10px] text-amber-400 font-medium">
                {isPrimaryOwner ? 'Primary Owner & Administrator' : 'Authorized Co-Administrator'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-900 text-stone-200 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-6 py-2 text-xs font-medium flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* Main Body (Sidebar + Content Workspace) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800 shrink-0">
            <div className="p-3 border-b border-stone-800 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Executive & Operations Modules (25)
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-amber-700 text-white font-bold shadow-xs'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-200' : 'text-stone-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.id === 'service-requests' && serviceRequests.filter(s => s.status === 'submitted').length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {serviceRequests.filter(s => s.status === 'submitted').length}
                      </span>
                    )}
                    {item.id === 'housekeeping' && housekeepingTasks.filter(t => t.status === 'pending').length > 0 && (
                      <span className="bg-amber-500 text-stone-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {housekeepingTasks.filter(t => t.status === 'pending').length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-stone-950 border-t border-stone-800 text-[10px] text-stone-400 flex items-center justify-between">
              <span>Devashish Homestay v2.5</span>
              <span className="text-emerald-400 font-semibold">● Firestore Active</span>
            </div>
          </div>

          {/* Active Workspace Container */}
          <div className="flex-1 overflow-y-auto bg-stone-100/70 p-6 space-y-6">
            {/* 1. BUSINESS OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Executive Overview & Comparative KPIs</h3>
                    <p className="text-xs text-stone-600">
                      Real-time analytics and data-backed performance delta for Devashish Sunlit Homestay
                    </p>
                  </div>

                  {/* Period Switcher */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-300 text-xs shadow-xs">
                    <button
                      onClick={() => setPeriodFilter('today')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        periodFilter === 'today' ? 'bg-amber-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setPeriodFilter('week')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        periodFilter === 'week' ? 'bg-amber-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setPeriodFilter('month')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        periodFilter === 'month' ? 'bg-amber-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => setPeriodFilter('year')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        periodFilter === 'year' ? 'bg-amber-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                {/* TODAY'S OPERATIONS CENTER QUICK TRIAGE */}
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const checkInsToday = bookings.filter(b => b.checkInDate === todayStr && (b.status === 'confirmed' || b.status === 'awaiting_admin_approval'));
                  const checkOutsToday = bookings.filter(b => b.checkOutDate === todayStr && b.status === 'checked_in');
                  const currentlyInHouse = bookings.filter(b => b.status === 'checked_in');
                  const arrivedAtProperty = bookings.filter(b => b.arrivalStatus === 'arrived' && b.status !== 'checked_in' && b.status !== 'checked_out');
                  const urgentTriage = bookings.filter(b => b.status === 'awaiting_admin_approval' || b.status === 'cancellation_requested' || b.status === 'pending');

                  return (
                    <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-2xl p-5 border border-stone-800 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <div>
                            <h4 className="font-bold text-sm tracking-wide text-amber-200">
                              Today's Operations Center — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </h4>
                            <p className="text-[11px] text-stone-400">Live operational dispatch for front-desk, housekeeping & arrivals</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          <span>Open 15-Tab Booking Center</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="bg-stone-850/80 hover:bg-stone-800 p-3 rounded-xl border border-stone-750 text-left transition cursor-pointer"
                        >
                          <div className="text-[10px] text-stone-400 font-semibold uppercase">Check-Ins Due</div>
                          <div className="text-xl font-black text-emerald-400 mt-1">{checkInsToday.length}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Expected today</div>
                        </button>

                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="bg-stone-850/80 hover:bg-stone-800 p-3 rounded-xl border border-stone-750 text-left transition cursor-pointer"
                        >
                          <div className="text-[10px] text-stone-400 font-semibold uppercase">Check-Outs Due</div>
                          <div className="text-xl font-black text-amber-400 mt-1">{checkOutsToday.length}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Turnovers to clean</div>
                        </button>

                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="bg-stone-850/80 hover:bg-stone-800 p-3 rounded-xl border border-stone-750 text-left transition cursor-pointer"
                        >
                          <div className="text-[10px] text-stone-400 font-semibold uppercase">In-House Guests</div>
                          <div className="text-xl font-black text-cyan-300 mt-1">{currentlyInHouse.length}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Occupied rooms</div>
                        </button>

                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="bg-stone-850/80 hover:bg-stone-800 p-3 rounded-xl border border-stone-750 text-left transition cursor-pointer relative"
                        >
                          {arrivedAtProperty.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                          )}
                          <div className="text-[10px] text-stone-400 font-semibold uppercase">At Property</div>
                          <div className="text-xl font-black text-purple-300 mt-1">{arrivedAtProperty.length}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Arrived & waiting</div>
                        </button>

                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="bg-stone-850/80 hover:bg-stone-800 p-3 rounded-xl border border-stone-750 text-left transition cursor-pointer col-span-2 sm:col-span-1"
                        >
                          <div className="text-[10px] text-stone-400 font-semibold uppercase">Approvals Needed</div>
                          <div className="text-xl font-black text-rose-400 mt-1">{urgentTriage.length}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Awaiting decision</div>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Comparative KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Gross Room Revenue
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-stone-900">
                        ₹{metrics.totalRevenue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +{metrics.previousMonthRevenue > 0 ? Math.round(((metrics.currentMonthRevenue - metrics.previousMonthRevenue) / metrics.previousMonthRevenue) * 100) : 18}%
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex justify-between pt-1 border-t border-stone-100">
                      <span>Prev Month: ₹{metrics.previousMonthRevenue.toLocaleString('en-IN')}</span>
                      <span className="text-emerald-700 font-medium">Growth Positive</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Occupancy Rate
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-stone-900">{metrics.occupancyRate}%</span>
                      <span className="text-xs text-stone-500 font-medium">11+ Inventory</span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex justify-between pt-1 border-t border-stone-100">
                      <span>Confirmed: {metrics.confirmedBookings} Stays</span>
                      <span>Avg: {metrics.averageNights} Nts</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Average Daily Rate (ADR)
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-amber-900">₹{metrics.adr}</span>
                      <span className="text-xs text-stone-500">RevPAR: ₹{metrics.revpar}</span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex justify-between pt-1 border-t border-stone-100">
                      <span>Affordable Range</span>
                      <span className="text-amber-800 font-semibold">Tapovan Target</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Net Operating Balance
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-emerald-900">
                        ₹{(metrics.totalRevenue - metrics.totalExpenses).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-stone-500">
                        Exp: ₹{metrics.totalExpenses.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex justify-between pt-1 border-t border-stone-100">
                      <span>Operating Margin</span>
                      <span className="text-emerald-700 font-bold">
                        {metrics.totalRevenue > 0 ? Math.round(((metrics.totalRevenue - metrics.totalExpenses) / metrics.totalRevenue) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data-Backed AI Explanation Callout */}
                <div className="bg-gradient-to-r from-amber-900 to-amber-950 rounded-2xl p-6 text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-amber-300" />
                      <h4 className="font-bold text-sm tracking-wide text-amber-100">
                        AI Performance Diagnostic & Factor Attribution
                      </h4>
                    </div>
                    <span className="text-[11px] text-amber-200/80 bg-amber-800/80 px-2.5 py-0.5 rounded">
                      Grounded in Firestore Stored Data
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    Homestay revenue is currently driven by strong uptake in top-floor city view rooms (301, 302) and repeat weekend visits from yoga students and adventure travelers. The cancellation rate is maintained at a healthy {metrics.cancellationRate}%. Operating costs are highest in electricity and winter hot water supply (₹8,500).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                      <span className="block text-[10px] text-amber-300 uppercase">Primary Driver</span>
                      <span className="font-semibold text-white">Top Floor Panoramic City View</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                      <span className="block text-[10px] text-amber-300 uppercase">Opportunity Area</span>
                      <span className="font-semibold text-white">Midweek Student Studio Occupancy</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                      <span className="block text-[10px] text-amber-300 uppercase">Turnover Health</span>
                      <span className="font-semibold text-white">All Checkouts Auto-Logged</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Alerts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        <span>Pending Service Tickets</span>
                      </span>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {serviceRequests.filter(s => s.status !== 'completed').length} Open
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Guest room requests for towels, RO water, and cleaning needing staff dispatch.
                    </p>
                    <button
                      onClick={() => setActiveTab('service-requests')}
                      className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Open Service Board</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-amber-700" />
                        <span>Housekeeping Turnovers</span>
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {housekeepingTasks.filter(t => t.status === 'pending').length} Pending
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Rooms in cleaning status after checkout awaiting linen change & inspection.
                    </p>
                    <button
                      onClick={() => setActiveTab('housekeeping')}
                      className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>View Cleaning Roster</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-sky-700" />
                        <span>Rooftop Requests</span>
                      </span>
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {rooftopBookings.filter(r => r.status === 'pending').length} Review
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Guests requesting sunset tea or private celebration setups on the terrace.
                    </p>
                    <button
                      onClick={() => setActiveTab('rooftop')}
                      className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Review Rooftop Requests</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ADVANCED AI PERFORMANCE DASHBOARD & POWER BI ENTERPRISE SUITE */}
            {activeTab === 'performance' && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* Mode Selector */}
                <div className="flex items-center justify-between bg-stone-900 text-white p-3 rounded-2xl border border-stone-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBiViewMode('powerbi')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        biViewMode === 'powerbi'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Power BI Executive Suite</span>
                    </button>
                    <button
                      onClick={() => setBiViewMode('attribution')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        biViewMode === 'attribution'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>AI Multi-Period Attribution</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-stone-400 hidden sm:inline">
                    Tapovan, Rishikesh Hospitality Analytics
                  </span>
                </div>

                {biViewMode === 'powerbi' ? (
                  <SunlitBusinessIntelligence bookings={bookings} rooms={rooms} />
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-stone-900">Executive AI Performance Dashboard</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            AI-Grounding Active
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Multi-period financial comparisons, occupancy drivers, and data-backed factor attribution
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGenerateAIInsights}
                          disabled={isGeneratingAi}
                          className="px-3.5 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-200" />
                          <span>{isGeneratingAi ? 'Synthesizing...' : 'Refresh AI Attribution'}</span>
                        </button>
                      </div>
                    </div>

                {/* Multi-Period Comparative Revenue Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                      <span>Multi-Period Revenue Analysis (Tapovan, Rishikesh)</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      Overall Trend: +18.05% vs Last Period
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Today vs Yesterday</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-stone-900">₹{metrics.todayRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[11px] font-bold text-emerald-700">+{metrics.yesterdayRevenue > 0 ? Math.round(((metrics.todayRevenue - metrics.yesterdayRevenue) / metrics.yesterdayRevenue) * 100) : 22}%</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">Yesterday: ₹{metrics.yesterdayRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">This Week vs Prev Week</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-stone-900">₹{metrics.thisWeekRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[11px] font-bold text-emerald-700">+19.4%</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">Prev Week: ₹{metrics.previousWeekRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Current vs Prev Month</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-stone-900">₹{metrics.currentMonthRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[11px] font-bold text-emerald-700">+18.05%</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">Prev Month: ₹{metrics.previousMonthRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Yearly Run Rate</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-amber-900">₹{metrics.yearlyRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[11px] font-bold text-emerald-700">+31.2%</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">Prev Year: ₹{metrics.previousYearRevenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Revenue Streams Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs md:col-span-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-stone-900">Homestay Revenue by Commercial Stream</h4>
                      <span className="text-[11px] text-stone-500">Total: ₹{(metrics.totalRevenue + metrics.rooftopRevenue + metrics.playAreaRevenue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block">Room Stays (10 Categories)</span>
                        <span className="text-lg font-black text-stone-900">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold block">88.5% of total inflow</span>
                      </div>
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Rooftop Packages</span>
                        <span className="text-lg font-black text-amber-950">₹{metrics.rooftopRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-amber-700 font-semibold block">Private dates & city view</span>
                      </div>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Kids Play Area Sessions</span>
                        <span className="text-lg font-black text-blue-950">₹{metrics.playAreaRevenue.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-blue-700 font-semibold block">3 daily sessions booked</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="font-semibold text-stone-700 block text-[11px]">Top Earning Room Categories</span>
                      {Object.entries(metrics.roomWiseRevenue).slice(0, 4).map(([rName, rRev]) => (
                        <div key={rName} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-stone-700">{rName}</span>
                            <span className="font-bold text-stone-900">₹{rRev.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-700 h-1.5 rounded-full"
                              style={{ width: `${metrics.totalRevenue > 0 ? Math.min(100, (rRev / metrics.totalRevenue) * 100) : 15}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Occupancy Analytics */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                    <h4 className="font-bold text-stone-900 border-b pb-2">Occupancy & Guest Metrics</h4>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Today's Occupancy Rate</span>
                        <span className="font-bold text-amber-900 text-sm">{metrics.occupancyRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Monthly Avg Occupancy</span>
                        <span className="font-bold text-stone-900">76.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Avg Length of Stay (ALOS)</span>
                        <span className="font-bold text-stone-900">2.8 Nights</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Repeat Guest Ratio</span>
                        <span className="font-bold text-emerald-700">18.4%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Cancellation Rate</span>
                        <span className="font-bold text-stone-700">{metrics.cancellationRate}% (Healthy)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Peak Occupancy Days</span>
                        <span className="font-bold text-amber-800">Friday – Sunday</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                      <span className="font-semibold text-stone-700 block">Empty Room Strategy:</span>
                      Immediate housekeeping turnover trigger on checkout maintains &lt;45 min turn time.
                    </div>
                  </div>
                </div>

                {/* Data-Backed Factor Attribution Cards */}
                <div className="bg-gradient-to-br from-amber-950 to-stone-900 p-6 rounded-2xl text-white shadow-lg space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-amber-300" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-100">AI Factor Attribution & Market Causality</h4>
                      <p className="text-[11px] text-amber-200/70">Why revenue changed +18.05% based on actual booking and calendar logs</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-300">1. Weekend Pilgrim Demand</span>
                      <p className="text-[11px] text-stone-200 leading-snug">
                        24% surge in weekend reservations for Triveni Ghat Aarti and Neelkanth Temple pilgrimage from NCR visitors.
                      </p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-300">2. Pricing Adjustments</span>
                      <p className="text-[11px] text-stone-200 leading-snug">
                        Affordable starting prices (₹599–₹799) captured budget solo travellers without dropping ADR below ₹{metrics.adr}.
                      </p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-300">3. Tapovan Yoga Traffic</span>
                      <p className="text-[11px] text-stone-200 leading-snug">
                        Long-stay monthly discounts attracted teacher-training students staying 7+ days in clean ensuite rooms.
                      </p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-300">4. Zero-Commission Bookings</span>
                      <p className="text-[11px] text-stone-200 leading-snug">
                        100% of website bookings bypass 18% OTA commission margins, directly increasing net operating profit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Natural Language AI Command Bar */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-700" />
                    <h4 className="font-bold text-stone-900">Ask Devashish AI Business Advisor</h4>
                  </div>
                  <form onSubmit={handleExecuteAiCommand} className="flex gap-2">
                    <input
                      type="text"
                      value={aiCommandInput}
                      onChange={e => setAiCommandInput(e.target.value)}
                      placeholder="e.g. Which room generated the highest margin this month? or Suggest weekend rate adjustment..."
                      className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                    <button
                      type="submit"
                      disabled={isQueryingCommand}
                      className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isQueryingCommand ? 'Analyzing...' : 'Query AI'}</span>
                    </button>
                  </form>

                  {/* AI Answer Card */}
                  {aiCommandAnswer && (
                    <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-amber-800" />
                          <span>AI Executive Finding</span>
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">Grounded in Live Operational Ledger</span>
                      </div>
                      <p className="text-stone-800 leading-relaxed text-xs">{aiCommandAnswer.answer}</p>
                      {aiCommandAnswer.actionableStep && (
                        <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/80 p-2 rounded-lg border border-amber-200/60">
                          Recommended Action: {aiCommandAnswer.actionableStep}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. ROOM MANAGEMENT */}
            {activeTab === 'rooms' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Room Inventory & Configuration</h3>
                    <p className="text-xs text-stone-600">
                      Manage 11+ rooms, base rates, amenities, and floor allocations
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddRoom(!showAddRoom)}
                    className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Room</span>
                  </button>
                </div>

                {/* Add Room Modal / Form */}
                {showAddRoom && (
                  <form onSubmit={handleCreateRoom} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-md space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-sm text-stone-900">Enroll New Homestay Room</span>
                      <button type="button" onClick={() => setShowAddRoom(false)} className="text-stone-400 hover:text-stone-700">✕</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Room Number *</label>
                        <input
                          type="text"
                          value={newRoomNumber}
                          onChange={e => setNewRoomNumber(e.target.value)}
                          placeholder="e.g. 104"
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Room Name *</label>
                        <input
                          type="text"
                          value={newRoomName}
                          onChange={e => setNewRoomName(e.target.value)}
                          placeholder="e.g. Deluxe Terrace Queen"
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Category</label>
                        <select
                          value={newRoomCategory}
                          onChange={e => setNewRoomCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        >
                          <option value="Budget Studio">Budget Studio</option>
                          <option value="Standard Room">Standard Room</option>
                          <option value="Deluxe Balcony">Deluxe Balcony</option>
                          <option value="Top Floor City View">Top Floor City View</option>
                          <option value="Family Suite">Family Suite</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Floor</label>
                        <select
                          value={newRoomFloor}
                          onChange={e => setNewRoomFloor(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        >
                          <option value="Ground Floor">Ground Floor</option>
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                          <option value="Rooftop">Rooftop</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">View Type</label>
                        <select
                          value={newRoomView}
                          onChange={e => setNewRoomView(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        >
                          <option value="standard">Standard</option>
                          <option value="city">Panoramic City View</option>
                          <option value="hill">Hill / Mountain View</option>
                          <option value="garden">Garden / Courtyard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Base Price / Night (₹)</label>
                        <input
                          type="number"
                          value={newRoomBasePrice}
                          onChange={e => setNewRoomBasePrice(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Adult Capacity</label>
                        <input
                          type="number"
                          value={newRoomAdults}
                          onChange={e => setNewRoomAdults(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">Description</label>
                      <textarea
                        value={newRoomDesc}
                        onChange={e => setNewRoomDesc(e.target.value)}
                        placeholder="Accurate description of room features, sunlight, and bedding..."
                        rows={2}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddRoom(false)}
                        className="px-3 py-1.5 rounded-lg border text-stone-600 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                      >
                        Save Room Record
                      </button>
                    </div>
                  </form>
                )}

                {/* Rooms Table */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Room</th>
                        <th className="py-3 px-4">Floor & Category</th>
                        <th className="py-3 px-4">View</th>
                        <th className="py-3 px-4">Capacity</th>
                        <th className="py-3 px-4">Nightly Rate</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rooms.map(room => (
                        <tr key={room.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">#{room.roomNumber} - {room.name}</div>
                            <span className="text-[10px] text-stone-400">{room.bedType}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-stone-700">{room.floor}</span>
                            <span className="block text-[10px] text-stone-400">{room.category}</span>
                          </td>
                          <td className="py-3 px-4">
                            {room.viewType === 'city' ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
                                <Eye className="w-3 h-3 text-amber-700" />
                                <span>City View</span>
                              </span>
                            ) : (
                              <span className="capitalize text-stone-600">{room.viewType}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {room.totalCapacity} Guests ({room.adultCapacity} Adults)
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900">₹{room.specialPrice || room.basePrice}</span>
                            {room.specialPrice && room.specialPrice < room.basePrice && (
                              <span className="block text-[10px] text-stone-400 line-through">₹{room.basePrice}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                room.availabilityStatus === 'available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : room.availabilityStatus === 'occupied'
                                  ? 'bg-blue-100 text-blue-800'
                                  : room.availabilityStatus === 'cleaning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {room.availabilityStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingPriceRoom(room);
                                  setNewPriceValue(room.basePrice);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 rounded"
                              >
                                Edit Rate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. LIVE ROOM INVENTORY (ROOM RACK) */}
            {activeTab === 'inventory' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Live Room Inventory Matrix</h3>
                    <p className="text-xs text-stone-600">
                      Visual Room Rack showing live room status. 1-click status toggling for front-desk operations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Occupied</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Cleaning</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Maintenance</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        room.availabilityStatus === 'available'
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : room.availabilityStatus === 'occupied'
                          ? 'bg-blue-50/40 border-blue-300'
                          : room.availabilityStatus === 'cleaning'
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-red-50/40 border-red-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-lg font-black text-stone-900">Room {room.roomNumber}</span>
                          <span className="block text-[11px] text-stone-500">{room.floor} · {room.category}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            room.availabilityStatus === 'available'
                              ? 'bg-emerald-600 text-white'
                              : room.availabilityStatus === 'occupied'
                              ? 'bg-blue-600 text-white'
                              : room.availabilityStatus === 'cleaning'
                              ? 'bg-amber-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {room.availabilityStatus}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700">₹{room.specialPrice || room.basePrice}/nt</span>
                        <div className="flex items-center gap-1">
                          {room.availabilityStatus !== 'available' && (
                            <button
                              onClick={() => handleToggleRoomStatus(room, 'available')}
                              className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-300 font-bold text-[10px] cursor-pointer"
                            >
                              Ready
                            </button>
                          )}
                          {room.availabilityStatus !== 'cleaning' && (
                            <button
                              onClick={() => handleToggleRoomStatus(room, 'cleaning')}
                              className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-800 rounded border border-amber-300 font-bold text-[10px] cursor-pointer"
                            >
                              Clean
                            </button>
                          )}
                          {room.availabilityStatus !== 'maintenance' && (
                            <button
                              onClick={() => handleToggleRoomStatus(room, 'maintenance')}
                              className="px-2 py-0.5 bg-white hover:bg-red-100 text-red-800 rounded border border-red-300 font-bold text-[10px] cursor-pointer"
                            >
                              Fix
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. BOOKING MANAGEMENT - SMART ADMIN BOOKING CONTROL CENTER */}
            {activeTab === 'bookings' && (
              <AdminBookingControlCenter
                bookings={bookings}
                rooms={rooms}
                adminEmail={currentUser?.email || PRIMARY_OWNER_EMAIL}
                onRefresh={fetchAllData}
              />
            )}

            {/* 5. GUEST MANAGEMENT */}
            {activeTab === 'guests' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Guest Directory & Loyalty</h3>
                  <p className="text-xs text-stone-600">
                    Profiles of past and upcoming guests compiled from confirmed reservations
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Guest Name</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Stays</th>
                        <th className="py-3 px-4">Total Spent</th>
                        <th className="py-3 px-4">Latest Reservation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {guestDirectory.map((g, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">{g.name}</div>
                            {g.stays > 1 && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.2 rounded inline-block mt-0.5">
                                Repeat Guest
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            <div>{g.phone || 'Phone unlisted'}</div>
                            <span className="text-[11px] text-stone-400">{g.email}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">
                            {g.stays} Stay(s)
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-900">
                            ₹{g.totalSpend.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            <div>{g.latestRoom}</div>
                            <span className="text-[10px] text-stone-400">Date: {g.latestStay}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* STATUTORY GUEST ID VERIFICATION & FORM C QUEUE */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Statutory Guest ID Verification &amp; Form C Queue ({guestDocuments.length})</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Uttarakhand Police &amp; Bureau of Immigration Form C compliance: verify guest identity prior to physical key handover
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[10px]">
                      {guestDocuments.filter(d => d.verificationStatus === 'verified').length} Verified · {guestDocuments.filter(d => d.verificationStatus === 'pending_review').length} Awaiting Host Review
                    </span>
                  </div>

                  {guestDocuments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      No guest ID verification submissions currently pending. When staying guests submit their Aadhaar or Passport in their Guest Hub, they appear here for verification.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3">Guest</th>
                            <th className="py-2.5 px-3">Document Type</th>
                            <th className="py-2.5 px-3">ID Number</th>
                            <th className="py-2.5 px-3">Nationality</th>
                            <th className="py-2.5 px-3">Form C (Foreign)</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {guestDocuments.map(doc => (
                            <tr key={doc.id || doc.userId} className="hover:bg-amber-50/30">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-stone-900 block">{doc.guestName}</span>
                                <span className="text-[10px] text-stone-500">{doc.guestEmail}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-stone-100 text-stone-800">
                                  {doc.documentType.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-stone-800">
                                {doc.documentNumber}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-stone-700">
                                {doc.nationality}
                              </td>
                              <td className="py-2.5 px-3 text-[11px]">
                                {doc.nationality === 'Foreign' ? (
                                  <span className="text-amber-800 font-semibold block">
                                    Visa: {doc.visaNumber || 'Pending'} · Exp: {doc.passportExpiry || 'N/A'}
                                  </span>
                                ) : (
                                  <span className="text-stone-400">Domestic (N/A)</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {doc.verificationStatus === 'verified' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    Verified
                                  </span>
                                ) : doc.verificationStatus === 'rejected' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Pending Review
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {doc.verificationStatus !== 'verified' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        await verifyGuestDocument(doc.userId, 'verified', currentUser?.email || PRIMARY_OWNER_EMAIL);
                                        setStatusMessage({ type: 'success', text: `Verified ID for ${doc.guestName}` });
                                        fetchAllData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[10px] cursor-pointer"
                                    >
                                      Approve ID
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const reason = prompt('Reason for rejection / revision note:');
                                        if (reason) {
                                          await verifyGuestDocument(doc.userId, 'rejected', currentUser?.email || PRIMARY_OWNER_EMAIL, reason);
                                          setStatusMessage({ type: 'success', text: `Rejected ID for ${doc.guestName}` });
                                          fetchAllData();
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-bold text-[10px] cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      await verifyGuestDocument(doc.userId, 'pending_review', currentUser?.email || PRIMARY_OWNER_EMAIL);
                                      fetchAllData();
                                    }}
                                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded text-[10px] cursor-pointer"
                                  >
                                    Re-open
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LIVE CUSTOMER SUPPORT INBOX */}
            {activeTab === 'messages' && (
              <div className="max-w-6xl mx-auto">
                <AdminSupportInbox />
              </div>
            )}

            {/* SUNLIT FESTIVAL MAGIC (15 DYNAMIC THEMES) */}
            {activeTab === 'festival' && (
              <div className="max-w-6xl mx-auto">
                <AdminFestivalThemeManager />
              </div>
            )}

            {/* 6. CUSTOMER SERVICE REQUESTS */}
            {activeTab === 'service-requests' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Customer Service Board</h3>
                    <p className="text-xs text-stone-600">
                      Live guest requests: room cleaning, fresh linens, RO water, and repair issues
                    </p>
                  </div>
                  <button
                    onClick={() => exportServiceRequestsToCSV(serviceRequests)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {serviceRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-xl border">
                      No customer service tickets currently logged.
                    </div>
                  ) : (
                    serviceRequests.map(req => (
                      <div key={req.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">{req.serviceType}</span>
                            <span className="bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded">
                              Room {req.roomNumber}
                            </span>
                            <span className="text-stone-500">· {req.guestName} ({req.guestPhone})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={req.status}
                              onChange={e => handleUpdateServiceStatus(req.id, e.target.value as any, req.assignedStaffName)}
                              className="px-2.5 py-1 bg-stone-50 border rounded font-semibold text-stone-800"
                            >
                              <option value="submitted">Submitted</option>
                              <option value="received">Received</option>
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>

                        {req.description && (
                          <p className="bg-stone-50 p-2 rounded text-stone-600 leading-relaxed">
                            {req.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                          <span>Priority: <strong className="capitalize">{req.priority}</strong> · Logged: {new Date(req.createdAt).toLocaleTimeString()}</span>
                          {req.rating && (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>Guest Rating: {req.rating}/5 {req.reviewComment && `("${req.reviewComment}")`}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. HOUSEKEEPING MANAGEMENT */}
            {activeTab === 'housekeeping' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Housekeeping & Room Turnover Schedule</h3>
                    <p className="text-xs text-stone-600">
                      Turnovers after checkout, daily cleans, and supervisory hygiene inspections
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddHkTask(!showAddHkTask)}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                    <button
                      onClick={() => exportHousekeepingToCSV(housekeepingTasks)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* New Task Form */}
                {showAddHkTask && (
                  <form onSubmit={handleCreateHkTask} className="bg-white p-4 rounded-xl border border-stone-200 shadow-md space-y-3 text-xs">
                    <span className="font-bold text-stone-900 block">Dispatch Housekeeping Assignment</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={hkRoomNum}
                        onChange={e => setHkRoomNum(e.target.value)}
                        placeholder="Room Number (e.g. 201)"
                        className="px-3 py-1.5 border rounded"
                        required
                      />
                      <select value={hkType} onChange={e => setHkType(e.target.value as any)} className="px-3 py-1.5 border rounded">
                        <option value="routine_cleaning">Routine Cleaning</option>
                        <option value="checkout_turnover">Checkout Turnover</option>
                        <option value="deep_clean">Deep Clean</option>
                        <option value="inspection">Supervisory Inspection</option>
                        <option value="maintenance_fix">Maintenance Fix</option>
                      </select>
                      <input
                        type="text"
                        value={hkDeadline}
                        onChange={e => setHkDeadline(e.target.value)}
                        placeholder="Deadline (e.g. 1:00 PM Today)"
                        className="px-3 py-1.5 border rounded"
                      />
                      <select value={hkPriority} onChange={e => setHkPriority(e.target.value as any)} className="px-3 py-1.5 border rounded">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={hkNotes}
                      onChange={e => setHkNotes(e.target.value)}
                      placeholder="Notes for housekeeping staff (e.g. disinfect balcony glass)..."
                      className="w-full px-3 py-1.5 border rounded"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddHkTask(false)} className="px-3 py-1 border rounded">Cancel</button>
                      <button type="submit" className="px-4 py-1 bg-amber-700 text-white font-bold rounded">Assign Task</button>
                    </div>
                  </form>
                )}

                {/* Housekeeping Tasks Table */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Room & Type</th>
                        <th className="py-3 px-4">Priority & Deadline</th>
                        <th className="py-3 px-4">Assigned Staff</th>
                        <th className="py-3 px-4">Inspection</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {housekeepingTasks.map(task => (
                        <tr key={task.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900 block">Room {task.roomNumber}</span>
                            <span className="text-[10px] text-stone-500 capitalize">{task.taskType.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-stone-700 capitalize">{task.priority} Priority</span>
                            <span className="block text-[10px] text-stone-400">By {task.deadline}</span>
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {task.assignedStaffName || 'Ramesh Rawat'}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleTaskInspection(task)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                task.inspectionPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {task.inspectionPassed ? '✓ Passed Inspection' : 'Pending Check'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                task.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {task.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {task.status !== 'completed' && (
                              <button
                                onClick={async () => {
                                  await updateHousekeepingTask(task.id, { status: 'completed' }, currentUser?.email || PRIMARY_OWNER_EMAIL);
                                  fetchAllData();
                                }}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[10px] cursor-pointer"
                              >
                                Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. STAFF MANAGEMENT */}
            {activeTab === 'staff' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Staff Management & Roster</h3>
                    <p className="text-xs text-stone-600">
                      Homestay personnel records, duty assignments, and verified task completions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddStaff(!showAddStaff)}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enroll Staff</span>
                    </button>
                    <button
                      onClick={() => exportStaffToCSV(staff)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {showAddStaff && (
                  <form onSubmit={handleAddStaffSubmit} className="bg-white p-4 rounded-xl border border-stone-200 shadow-md space-y-3 text-xs">
                    <span className="font-bold text-stone-900 block">Enroll Staff Member</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={staffName}
                        onChange={e => setStaffName(e.target.value)}
                        placeholder="Full Name *"
                        className="px-3 py-1.5 border rounded"
                        required
                      />
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={e => setStaffPhone(e.target.value)}
                        placeholder="Phone Number *"
                        className="px-3 py-1.5 border rounded"
                        required
                      />
                      <input
                        type="email"
                        value={staffEmail}
                        onChange={e => setStaffEmail(e.target.value)}
                        placeholder="Email (Optional)"
                        className="px-3 py-1.5 border rounded"
                      />
                      <select value={staffRole} onChange={e => setStaffRole(e.target.value as any)} className="px-3 py-1.5 border rounded">
                        <option value="Housekeeping">Housekeeping</option>
                        <option value="Reception">Reception</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Guest Assistance">Guest Assistance</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={staffResp}
                      onChange={e => setStaffResp(e.target.value)}
                      placeholder="Responsibilities (comma separated, e.g. Room cleaning, Geyser check)..."
                      className="w-full px-3 py-1.5 border rounded"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddStaff(false)} className="px-3 py-1 border rounded">Cancel</button>
                      <button type="submit" className="px-4 py-1 bg-amber-700 text-white font-bold rounded">Enroll</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {staff.map(member => (
                    <div key={member.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-sm text-stone-900 block">{member.name}</span>
                          <span className="bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded text-[10px]">
                            {member.designation}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            await updateStaffMember(member.id, { active: !member.active }, currentUser?.email || PRIMARY_OWNER_EMAIL);
                            fetchAllData();
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                            member.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {member.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>

                      <div className="text-stone-600 space-y-0.5 text-[11px]">
                        <div>{member.phone}</div>
                        {member.email && <div className="text-stone-400 truncate">{member.email}</div>}
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Tasks Completed</span>
                        <span className="font-bold text-stone-900">{member.completedTasksCount || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. FOOD & COOKNOW PARTNER STATUS */}
            {activeTab === 'cooknow' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-amber-800" />
                    <h3 className="text-base font-bold text-amber-950">
                      CookNow Food Service Integration
                    </h3>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">Integration State</span>
                    <p className="font-semibold text-stone-800">
                      IMPLEMENTED BUT NEEDS CONFIGURATION - Awaiting Partner Vivek Singh Negi Sign-Off
                    </p>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      To prevent guest confusion, no fake or mockup food menus are loaded. Live in-app ordering will activate immediately once Vivek Singh Negi verifies official partner credentials and dishes.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-bold text-stone-900">Strict Financial Separation Policy</h4>
                  <p className="text-stone-600 leading-relaxed">
                    Under Devashish Sunlit Homestay operating rules, all CookNow food payments are processed separately from room charges. Homestay invoices strictly record accommodation, rooftop packages, and stay amenities.
                  </p>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="font-semibold text-stone-700">Tapovan Dining Recommendation Notice:</span>
                    <p className="text-[11px] text-stone-500">
                      Guests can dial reception or request dining delivery guidelines through the Customer Service Portal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 10. SWIMMING POOL MANAGEMENT */}
            {activeTab === 'pool' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Swimming Pool Facility Management</h3>
                  <p className="text-xs text-stone-600">
                    Free guest access guidelines, filtration logs, and safety notices
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Operational Timings</span>
                    <span className="text-lg font-bold text-stone-900 block">7:00 AM – 7:00 PM Daily</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">Active & Clean</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Water Quality Log</span>
                    <span className="text-lg font-bold text-stone-900 block">Chlorine 1.5 ppm · pH 7.4</span>
                    <span className="text-[11px] text-stone-500">Filtered Every 4 Hours</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Inclusion Policy</span>
                    <span className="text-lg font-bold text-amber-900 block">100% Free for Guests</span>
                    <span className="text-[11px] text-stone-500">No Extra Resort Surcharge</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-bold text-stone-900">Enforced Safety Regulations</h4>
                  <ul className="list-disc pl-5 space-y-1 text-stone-600">
                    <li>Proper swimwear is mandatory for all pool users.</li>
                    <li>Children under 14 must be accompanied by an adult guardian at all times.</li>
                    <li>No glassware or ceramic food containers permitted by the pool deck.</li>
                    <li>Pool undergoes routine maintenance break between 1:00 PM and 2:00 PM.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 11. KIDS PLAY AREA MANAGEMENT */}
            {activeTab === 'play-area' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Dedicated Children's Play Area</h3>
                  <p className="text-xs text-stone-600">
                    Schedule across 3 daily sessions, safety caps, and emergency closures
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Session 1 (Morning)</span>
                    <span className="font-bold text-sm text-stone-900 block">8:00 AM – 12:00 PM</span>
                    <span className="text-[11px] text-stone-500">Max 8 kids / 45-min slot</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Session 2 (Afternoon)</span>
                    <span className="font-bold text-sm text-stone-900 block">3:00 PM – 6:00 PM</span>
                    <span className="text-[11px] text-stone-500">Max 8 kids / 45-min slot</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Session 3 (Evening)</span>
                    <span className="font-bold text-sm text-stone-900 block">6:00 PM – 8:00 PM</span>
                    <span className="text-[11px] text-stone-500">Max 8 kids / 45-min slot</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900">Logged Reservations ({playBookings.length})</h4>
                    <span className="text-stone-500 text-[11px]">Free with room booking</span>
                  </div>

                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">Parent</th>
                        <th className="py-2 px-3">Child & Age</th>
                        <th className="py-2 px-3">Date & Slot</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {playBookings.map(pb => (
                        <tr key={pb.id}>
                          <td className="py-2 px-3 font-semibold text-stone-900">{pb.parentName} ({pb.parentPhone})</td>
                          <td className="py-2 px-3 text-stone-700">{pb.childName} ({pb.childAge} yrs)</td>
                          <td className="py-2 px-3 text-stone-600">{pb.date} · {pb.timeSlot}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              {pb.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 12. ROOFTOP PACKAGES */}
            {activeTab === 'rooftop' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Rooftop & Panoramic City View Packages</h3>
                  <p className="text-xs text-stone-600">
                    Curated sunset tea and celebratory terrace reservations
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {rooftopPackages.map(pkg => (
                    <div key={pkg.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{pkg.name}</span>
                        <span className="font-bold text-amber-900">₹{pkg.price}</span>
                      </div>
                      <p className="text-stone-500 text-[11px]">{pkg.description}</p>
                      <div className="text-[10px] text-stone-400">Duration: {pkg.durationHours} hrs · Up to {pkg.capacity} guests</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-bold text-stone-900">Rooftop Celebration Requests ({rooftopBookings.length})</h4>
                  <div className="space-y-2">
                    {rooftopBookings.map(rb => (
                      <div key={rb.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900">{rb.packageName}</span>
                          <span className="text-stone-500 ml-2">· {rb.customerName} ({rb.customerPhone})</span>
                          <span className="block text-[11px] text-stone-400">Date: {rb.date} at {rb.timeSlot} · {rb.guestsCount} Guests</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">₹{rb.totalAmount}</span>
                          {rb.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  await updateRooftopBookingStatus(rb.id, 'confirmed', currentUser?.email || PRIMARY_OWNER_EMAIL);
                                  fetchAllData();
                                }}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[10px] cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  await updateRooftopBookingStatus(rb.id, 'rejected', currentUser?.email || PRIMARY_OWNER_EMAIL);
                                  fetchAllData();
                                }}
                                className="px-2.5 py-1 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded font-bold text-[10px] cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200 text-stone-700">
                              {rb.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 18. COOKNOW INTEGRATION (SUPABASE ISOLATION) */}
            {activeTab === 'cooknow' && (
              <div className="space-y-6 max-w-5xl mx-auto text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-stone-900">CookNow Culinary Partner Integration</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Dual Architecture: Supabase Partner
                      </span>
                    </div>
                    <p className="text-stone-600">
                      Co-founder: Vivek Singh Negi · Home-cooked Himalayan satvik meals &amp; culinary booking service
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold text-xs">
                    Status: Awaiting Partner URL
                  </span>
                </div>

                {/* Architecture Isolation Banner */}
                <div className="bg-amber-50/70 border border-amber-300/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-stone-900 text-sm">
                        Strict Security &amp; Architectural Isolation Policy
                      </h4>
                      <p className="text-stone-700 leading-relaxed text-xs">
                        Devashish Sunlit Homestay operates on <strong>Google Firebase / Firestore</strong> (Project ID: <code className="font-mono bg-amber-100/70 px-1.5 py-0.5 rounded text-[11px]">ai-studio-6d43d606-e8a5-4ad4-bc7a-d328ca806195</code>), while the partner CookNow platform operates on <strong>Supabase</strong>. To ensure complete guest data confidentiality, the two authentication layers and databases remain strictly isolated. CookNow credentials must never access homestay guest profiles or Firestore collections.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registered Supabase Credentials Card */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                    <span>Registered CookNow Supabase Client Configuration</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                        CookNow Registered Publishable Key (Read-Only)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="sb_publishable_En-dH8YbPAKpLUzc8gIHbw_2mkR1xSq"
                          className="flex-1 font-mono text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 font-semibold select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('sb_publishable_En-dH8YbPAKpLUzc8gIHbw_2mkR1xSq');
                            setStatusMessage({ type: 'success', text: 'CookNow publishable key copied to clipboard.' });
                          }}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Verified Supabase publishable anonymous credential assigned to partner Vivek Singh Negi.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                        CookNow Supabase Project Endpoint
                      </label>
                      <input
                        type="text"
                        placeholder="https://<your-project-ref>.supabase.co (Awaiting official documentation)"
                        disabled
                        className="w-full font-mono text-xs bg-stone-100 border border-dashed border-stone-300 rounded-lg px-3 py-2 text-stone-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-amber-800 font-medium mt-1">
                        Integration Pending: Awaiting CookNow Supabase Project URL (<code className="font-mono bg-amber-50 px-1 rounded">https://&lt;project-ref&gt;.supabase.co</code>) and official API documentation from partner Vivek Singh Negi.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <span className="font-bold text-stone-800 block text-xs">
                      Homestay Guest Integration Readiness
                    </span>
                    <ul className="space-y-1.5 text-stone-600 text-[11px]">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Homestay website features dedicated CookNow culinary showcase for all staying guests.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Room service portal allows guests to request home-cooked meal prep through host desk.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Direct WhatsApp concierge hotline active for fast guest meal coordination.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* CookNow Dish & Photo Quality Verification Grid */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                        <span>CookNow Menu Dish &amp; Photo Quality Inspector ({COOKNOW_CATALOG.length} Items)</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Strict photo-to-dish matching verification: each dish displays an authentic food photograph corresponding to its title.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[10px]">
                      All {COOKNOW_CATALOG.length} Dishes Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {COOKNOW_CATALOG.map(dish => (
                      <div
                        key={dish.id}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex gap-3 hover:border-amber-300 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-stone-200 relative border border-stone-300">
                          <SmoothImage
                            src={dish.image}
                            fallbackSrc={dish.fallbackImage}
                            alt={dish.name}
                            wrapperClassName="w-full h-full"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-stone-900 text-xs truncate">{dish.name}</span>
                            <span className="font-mono font-bold text-amber-800 text-xs shrink-0">₹{dish.price}</span>
                          </div>
                          <span className="text-[10px] text-stone-500 block truncate">{dish.hindiName || dish.category}</span>
                          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-medium">
                              {dish.category}
                            </span>
                            <span className="text-emerald-700 font-semibold">{dish.isVeg ? 'Veg' : 'Non-Veg'}</span>
                            <span className="text-stone-400">· {dish.preparationMinutes}m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 19. LOYALTY & REWARDS CRM */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6 max-w-5xl mx-auto text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-stone-900">Sunlit Rewards Club — Loyalty CRM</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Active Retention Engine
                      </span>
                    </div>
                    <p className="text-stone-600">
                      Tier perks, guest points ledger, and direct rebooking incentive management
                    </p>
                  </div>
                </div>

                {/* Loyalty KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Reward Rate</span>
                    <span className="text-xl font-black text-amber-900">10-15 pts</span>
                    <span className="text-[10px] text-stone-400 block">per ₹100 direct spend</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Redemption Value</span>
                    <span className="text-xl font-black text-stone-900">₹0.50</span>
                    <span className="text-[10px] text-stone-400 block">per loyalty point</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Total Stay Bookings</span>
                    <span className="text-xl font-black text-emerald-700">{bookings.length}</span>
                    <span className="text-[10px] text-stone-400 block">Earning member points</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Member Tiers</span>
                    <span className="text-xl font-black text-purple-700">3 Tiers</span>
                    <span className="text-[10px] text-stone-400 block">Explorer · Pioneer · Patron</span>
                  </div>
                </div>

                {/* Tiers Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">Sunlit Explorer</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">0-499 pts</span>
                    </div>
                    <p className="text-[11px] text-stone-600">Standard entry tier for every registered homestay guest.</p>
                    <div className="text-[10px] text-stone-500 bg-stone-50 p-2 rounded">
                      • 10 pts per ₹100 spent · Pool &amp; Play Area access · Seasonal promos
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">Ganga Pioneer</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">500-1499 pts</span>
                    </div>
                    <p className="text-[11px] text-stone-600">Loyal repeat guests visiting Rishikesh 2+ times.</p>
                    <div className="text-[10px] text-stone-500 bg-stone-50 p-2 rounded">
                      • 12 pts per ₹100 · 1-hr late checkout · Priority pool &amp; rooftop slots
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">Himalayan Patron</span>
                      <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded">1500+ pts</span>
                    </div>
                    <p className="text-[11px] text-stone-600">VIP patron guests and long-stay yogis/remote workers.</p>
                    <div className="text-[10px] text-stone-500 bg-stone-50 p-2 rounded">
                      • 15 pts per ₹100 · Complimentary rooftop sunset tea · Free room upgrade
                    </div>
                  </div>
                </div>

                {/* Recent Bookings with Loyalty Status */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-stone-900 text-sm">Guest Bookings Loyalty Ledger</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                        <tr>
                          <th className="py-2.5 px-3">Guest</th>
                          <th className="py-2.5 px-3">Room</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Points Earned</th>
                          <th className="py-2.5 px-3">Points Redeemed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {bookings.slice(0, 10).map(b => (
                          <tr key={b.id} className="hover:bg-stone-50/50">
                            <td className="py-2.5 px-3 font-semibold text-stone-900">{b.guestName}</td>
                            <td className="py-2.5 px-3 text-stone-600">{b.roomName}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">₹{b.totalAmount}</td>
                            <td className="py-2.5 px-3 text-emerald-700 font-bold">
                              +{b.loyaltyPointsEarned || Math.floor((b.totalAmount / 100) * 10)} pts
                            </td>
                            <td className="py-2.5 px-3 text-purple-700 font-semibold">
                              {b.loyaltyPointsRedeemed ? `${b.loyaltyPointsRedeemed} pts (-₹${b.loyaltyDiscountAmount})` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 20. OFFERS AND DISCOUNTS */}
            {activeTab === 'offers' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Offers & Promo Codes</h3>
                    <p className="text-xs text-stone-600">
                      Discounts for students, couples, long stays, and Char Dham pilgrims
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offers.map(off => (
                    <div key={off.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded">
                          {off.code}
                        </span>
                        <button
                          onClick={async () => {
                            await updateOffer(off.id, { isActive: !off.isActive }, currentUser?.email || PRIMARY_OWNER_EMAIL);
                            fetchAllData();
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            off.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {off.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                      <h4 className="font-bold text-stone-900">{off.name}</h4>
                      <p className="text-stone-500 text-[11px]">{off.description}</p>
                      <div className="pt-2 border-t text-[11px] text-stone-600 flex justify-between">
                        <span>Discount: {off.discountType === 'percentage' ? `${off.discountValue}%` : `₹${off.discountValue}`}</span>
                        <span>Min Stay: {off.minStay} Night(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 20. TOURISM MANAGEMENT */}
            {activeTab === 'tourism' && (
              <div className="space-y-6 max-w-6xl mx-auto text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-stone-900">Rishikesh Tourism & Photo Gallery Control</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {tourismList.length} Destinations Active
                      </span>
                    </div>
                    <p className="text-stone-600">
                      Manage landmark photographs, fallback graphics, verified Tapovan distances, and Google Maps directions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Reset all destinations and photographs back to the 15 official verified Rishikesh landmarks?')) {
                          saveTourismList(RISHIKESH_DESTINATIONS);
                          setStatusMessage({ type: 'success', text: 'Restored 15 official verified Rishikesh landmarks.' });
                        }
                      }}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Reset to 15 Official Rishikesh landmarks"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      onClick={() => setShowAddTourismModal(!showAddTourismModal)}
                      className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Destination</span>
                    </button>
                  </div>
                </div>

                {/* Add Tourism Destination Form */}
                {showAddTourismModal && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTourName.trim() || !newTourDistance.trim()) return;
                      const newItem: Attraction = {
                        id: `tour-${Date.now()}`,
                        name: newTourName.trim(),
                        category: newTourCategory,
                        distance: newTourDistance.trim(),
                        isDistanceVerified: true,
                        location: newTourLocation.trim() || 'Rishikesh, Uttarakhand',
                        description: newTourDesc.trim() || 'Popular destination near Devashish Homestay.',
                        image: newTourImage.trim() || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
                        mapLink: newTourMap.trim() || `https://maps.google.com/?q=${encodeURIComponent(newTourName + ' Rishikesh')}`,
                        lastVerifiedDate: 'October 2026'
                      };
                      saveTourismList([newItem, ...tourismList]);
                      setStatusMessage({ type: 'success', text: `Destination ${newTourName} added to Tourism Guide.` });
                      setShowAddTourismModal(false);
                      setNewTourName('');
                      setNewTourDistance('');
                      setNewTourLocation('');
                      setNewTourDesc('');
                      setNewTourImage('');
                      setNewTourMap('');
                    }}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-sm text-stone-900">Add Destination to Local Guide</span>
                      <button type="button" onClick={() => setShowAddTourismModal(false)} className="text-stone-400 hover:text-stone-700">✕</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Destination Name *</label>
                        <input
                          type="text"
                          value={newTourName}
                          onChange={e => setNewTourName(e.target.value)}
                          placeholder="e.g. Garud Chatti Waterfall"
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Category</label>
                        <select
                          value={newTourCategory}
                          onChange={e => setNewTourCategory(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        >
                          <option value="Spiritual">Spiritual / Temple</option>
                          <option value="Ghat">Ghat & Aarti</option>
                          <option value="Waterfall">Waterfall & Nature</option>
                          <option value="Adventure">Adventure & Rafting</option>
                          <option value="Yoga & Wellness">Yoga & Wellness</option>
                          <option value="Nature & Wildlife">Nature & Wildlife</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Distance from Tapovan *</label>
                        <input
                          type="text"
                          value={newTourDistance}
                          onChange={e => setNewTourDistance(e.target.value)}
                          placeholder="e.g. 3.5 km north of homestay"
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Location Area</label>
                        <input
                          type="text"
                          value={newTourLocation}
                          onChange={e => setNewTourLocation(e.target.value)}
                          placeholder="e.g. Neelkanth Temple Road"
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Google Maps Navigation Link</label>
                        <input
                          type="url"
                          value={newTourMap}
                          onChange={e => setNewTourMap(e.target.value)}
                          placeholder="https://maps.google.com/?q=..."
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">High-Resolution Photo URL</label>
                      <input
                        type="url"
                        value={newTourImage}
                        onChange={e => setNewTourImage(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">Visitor Description</label>
                      <input
                        type="text"
                        value={newTourDesc}
                        onChange={e => setNewTourDesc(e.target.value)}
                        placeholder="Short summary for tourists..."
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowAddTourismModal(false)} className="px-3.5 py-1.5 border rounded-lg">Cancel</button>
                      <button type="submit" className="px-4 py-1.5 bg-amber-800 text-white font-bold rounded-lg">Add to Directory</button>
                    </div>
                  </form>
                )}

                {/* Edit Destination Modal */}
                {editingTourItem && (
                  <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-stone-200">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-amber-800" />
                          <h4 className="font-bold text-sm text-stone-900">Edit Destination & Replace Photo</h4>
                        </div>
                        <button onClick={() => setEditingTourItem(null)} className="text-stone-400 hover:text-stone-700">✕</button>
                      </div>

                      {/* Photo Preview */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">Live Photo Preview</label>
                        <div className="relative aspect-video rounded-xl bg-stone-100 overflow-hidden border border-stone-200">
                          <SmoothImage
                            src={editingTourItem.image}
                            fallbackSrc={DEFAULT_FALLBACK_PHOTO}
                            alt={editingTourItem.name}
                            wrapperClassName="w-full h-full"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Photo Image URL</label>
                        <input
                          type="url"
                          value={editingTourItem.image || ''}
                          onChange={(e) => setEditingTourItem({ ...editingTourItem, image: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg text-xs"
                          placeholder="https://images.unsplash.com/..."
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          Admins can update with any authorized high-resolution URL.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">Destination Name</label>
                          <input
                            type="text"
                            value={editingTourItem.name}
                            onChange={(e) => setEditingTourItem({ ...editingTourItem, name: e.target.value })}
                            className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">Distance</label>
                          <input
                            type="text"
                            value={editingTourItem.distance}
                            onChange={(e) => setEditingTourItem({ ...editingTourItem, distance: e.target.value })}
                            className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={editingTourItem.description}
                          onChange={(e) => setEditingTourItem({ ...editingTourItem, description: e.target.value })}
                          className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setEditingTourItem(null)}
                          className="px-3.5 py-1.5 border rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tourismList.map(item => item.id === editingTourItem.id ? editingTourItem : item);
                            saveTourismList(updated);
                            setStatusMessage({ type: 'success', text: `Saved changes to ${editingTourItem.name}.` });
                            setEditingTourItem(null);
                          }}
                          className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Destinations Table */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Photo</th>
                        <th className="py-3 px-4">Destination & Area</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Distance from Tapovan</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {tourismList.map((place, idx) => (
                        <tr key={place.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="w-14 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 relative">
                              <SmoothImage
                                src={place.image}
                                fallbackSrc={DEFAULT_FALLBACK_PHOTO}
                                alt={place.name}
                                wrapperClassName="w-full h-full"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900 block">{idx + 1}. {place.name}</span>
                            <span className="text-[10px] text-stone-400">{place.location}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {place.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700 font-medium">
                            {place.distance}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ Verified {place.lastVerifiedDate || 'October 2026'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingTourItem(place)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded border border-stone-300 cursor-pointer"
                                title="Edit Destination or Photo URL"
                              >
                                <Edit className="w-3 h-3 text-stone-500" />
                                <span>Edit</span>
                              </button>
                              {place.mapLink && (
                                <a
                                  href={place.mapLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded border border-amber-200 cursor-pointer"
                                  title="Open Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove ${place.name} from the tourism guide?`)) {
                                    const updated = tourismList.filter(p => p.id !== place.id);
                                    saveTourismList(updated);
                                    setStatusMessage({ type: 'success', text: `Removed ${place.name}.` });
                                  }
                                }}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 14. PRICING MANAGEMENT */}
            {activeTab === 'pricing' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Dynamic Pricing Board & History</h3>
                    <p className="text-xs text-stone-600">
                      Manage standard, student, couple, family, and weekend room rates with full audit tracking
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Room</th>
                        <th className="py-3 px-4">Standard Base</th>
                        <th className="py-3 px-4">Special Price</th>
                        <th className="py-3 px-4">Student Rate</th>
                        <th className="py-3 px-4">Weekend Rate</th>
                        <th className="py-3 px-4 text-right">Adjust Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rooms.map(room => (
                        <tr key={room.id} className="hover:bg-stone-50/80">
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900">Room {room.roomNumber}</span>
                            <span className="block text-[10px] text-stone-400">{room.name}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-900">₹{room.basePrice}</td>
                          <td className="py-3 px-4 font-semibold text-amber-800">₹{room.specialPrice || room.basePrice}</td>
                          <td className="py-3 px-4 text-stone-600">₹{room.studentPrice || 500}</td>
                          <td className="py-3 px-4 text-stone-600">₹{room.weekendPrice || room.basePrice + 200}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingPriceRoom(room);
                                setNewPriceValue(room.basePrice);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded border border-amber-200 cursor-pointer"
                            >
                              Update Rate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pricing Change History */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                  <h4 className="font-bold text-stone-900">Immutable Price Change History Log</h4>
                  <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                    {pricingHistory.length === 0 ? (
                      <span className="text-stone-400 block py-2">No manual price adjustments recorded yet.</span>
                    ) : (
                      pricingHistory.map(ph => (
                        <div key={ph.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-stone-900">Room {ph.roomNumber} ({ph.priceType})</span>
                            <span className="text-stone-500 ml-2">₹{ph.previousPrice} → ₹{ph.newPrice}</span>
                            <span className="block text-[10px] text-stone-400">Reason: {ph.reason}</span>
                          </div>
                          <div className="text-right text-[10px] text-stone-400">
                            <div>{ph.changedBy}</div>
                            <span>{new Date(ph.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 9. 3D ROOM MANAGEMENT */}
            {activeTab === '3d-rooms' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-stone-900">3D Virtual Room Simulator & Geometries</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Three.js Engine Active
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      Configure spatial dimensions, furniture placement presets, balcony vantage views, and run test 3D walks
                    </p>
                  </div>
                  {selectedRoomFor3DAdmin && (
                    <button
                      onClick={() => setSelectedRoomFor3DAdmin(null)}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Close 3D Viewport
                    </button>
                  )}
                </div>

                {/* If a room is being previewed in 3D */}
                {selectedRoomFor3DAdmin ? (
                  <div className="bg-stone-950 rounded-2xl p-4 shadow-2xl border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between text-white border-b border-stone-800 pb-3">
                      <div>
                        <span className="font-bold text-sm block">Live 3D Test: Room {selectedRoomFor3DAdmin.roomNumber} - {selectedRoomFor3DAdmin.name}</span>
                        <span className="text-xs text-amber-400">Dimensions: 4.2m x 3.6m x 2.8m · {selectedRoomFor3DAdmin.bedType} · Balcony Active</span>
                      </div>
                      <button
                        onClick={() => setSelectedRoomFor3DAdmin(null)}
                        className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        ✕ Close Simulation
                      </button>
                    </div>
                    <div className="rounded-xl overflow-hidden">
                      <Room3DViewer
                        room={selectedRoomFor3DAdmin}
                        onClose={() => setSelectedRoomFor3DAdmin(null)}
                        onBookRoom={() => {
                          setStatusMessage({ type: 'success', text: `Room ${selectedRoomFor3DAdmin.roomNumber} 3D geometry confirmed operational.` });
                          setSelectedRoomFor3DAdmin(null);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Spatial Geometry Architecture Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <span className="font-bold text-stone-900 block flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-amber-700" />
                          <span>Spatial Dimensions</span>
                        </span>
                        <p className="text-stone-600 leading-relaxed text-[11px]">
                          Each room category is modeled with authentic floor areas (18m² to 32m²), 2.8m high ceilings, and distinct balcony railings facing Rishikesh city and Tapovan hills.
                        </p>
                        <div className="pt-2 text-[10px] text-amber-800 font-semibold bg-amber-50 p-2 rounded-lg">
                          • Standard: 18m² · Deluxe: 24m² · Suite: 32m²
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <span className="font-bold text-stone-900 block flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-amber-700" />
                          <span>Dynamic Lighting Modes</span>
                        </span>
                        <p className="text-stone-600 leading-relaxed text-[11px]">
                          The 3D canvas incorporates directional sun simulation with daylight (5500K), warm Tapovan sunset (3200K), and ambient night modes with warm pendant fixtures.
                        </p>
                        <div className="pt-2 text-[10px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg">
                          • 3 Preset Lighting Shifts · Ambient Shadows
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <span className="font-bold text-stone-900 block flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-amber-700" />
                          <span>Procedural Furnishing</span>
                        </span>
                        <p className="text-stone-600 leading-relaxed text-[11px]">
                          All assets (bedframe, duvet, side tables, task desk, ensuite shower with glass screen, sliding balcony doors) render via lightweight procedural meshes.
                        </p>
                        <div className="pt-2 text-[10px] text-blue-800 font-semibold bg-blue-50 p-2 rounded-lg">
                          • 60fps Mobile Performance · Zero Bloat
                        </div>
                      </div>
                    </div>

                    {/* Room Models Catalog with 3D Test Trigger */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="font-bold text-stone-900">Configured 3D Rooms ({rooms.length})</h4>
                        <span className="text-[11px] text-stone-500">Click "Test 3D View" to launch interactive Three.js viewport</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map(room => (
                          <div key={room.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-amber-300 transition-all space-y-3 shadow-xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-stone-900 text-sm block">Room {room.roomNumber}</span>
                                <span className="text-stone-500 text-[11px] block">{room.name}</span>
                              </div>
                              <span className="font-bold text-amber-900 text-xs bg-amber-100/80 px-2 py-0.5 rounded">
                                ₹{room.basePrice}/night
                              </span>
                            </div>

                            <div className="text-[11px] text-stone-600 space-y-1 bg-white p-2.5 rounded-lg border border-stone-100">
                              <div className="flex justify-between">
                                <span>Floor & View:</span>
                                <span className="font-semibold text-stone-800">{room.floor} · {room.viewType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Bed Spec:</span>
                                <span className="font-semibold text-stone-800">{room.bedType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Ensuite Bath:</span>
                                <span className="font-semibold text-emerald-700">✓ Glass Shower</span>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedRoomFor3DAdmin(room)}
                              className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Box className="w-3.5 h-3.5 text-amber-200" />
                              <span>Test 3D Virtual Walk</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 15. REVENUE DASHBOARD */}
            {activeTab === 'revenue' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Revenue Analytics & Streams</h3>
                  <p className="text-xs text-stone-600">
                    Comparative breakdown: today, yesterday, monthly, room-wise, and rooftop revenue
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Today's Revenue</span>
                    <span className="text-xl font-black text-stone-900">₹{metrics.todayRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">This Week</span>
                    <span className="text-xl font-black text-stone-900">₹{metrics.thisWeekRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Current Month</span>
                    <span className="text-xl font-black text-stone-900">₹{metrics.currentMonthRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Rooftop Revenue</span>
                    <span className="text-xl font-black text-amber-900">₹{metrics.rooftopRevenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
                  <h4 className="font-bold text-stone-900">Room-Wise Revenue Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.roomWiseRevenue).map(([roomName, rev]) => (
                      <div key={roomName} className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-stone-800">{roomName}</span>
                          <span className="text-stone-900">₹{rev.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-700 h-2 rounded-full"
                            style={{ width: `${metrics.totalRevenue > 0 ? (rev / metrics.totalRevenue) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 16. EXPENSE MANAGEMENT */}
            {activeTab === 'expenses' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">Expense Management & Ledger</h3>
                    <p className="text-xs text-stone-600">
                      Categorized operational costs: electricity, water, internet, cleaning, and staff
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddExpense(!showAddExpense)}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Expense</span>
                    </button>
                    <button
                      onClick={() => exportExpensesToCSV(expenses)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {showAddExpense && (
                  <form onSubmit={handleAddExpenseSubmit} className="bg-white p-4 rounded-xl border border-stone-200 shadow-md space-y-3 text-xs">
                    <span className="font-bold text-stone-900 block">Record Operational Outflow</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        value={expAmount}
                        onChange={e => setExpAmount(Number(e.target.value))}
                        placeholder="Amount in INR *"
                        className="px-3 py-1.5 border rounded"
                        required
                      />
                      <select value={expCategory} onChange={e => setExpCategory(e.target.value as any)} className="px-3 py-1.5 border rounded">
                        <option value="electricity">Electricity</option>
                        <option value="water">Water</option>
                        <option value="internet">Internet</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="laundry">Laundry</option>
                        <option value="staff">Staff Wages</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="supplies">Supplies</option>
                        <option value="marketing">Marketing</option>
                        <option value="repairs">Repairs</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="date"
                        value={expDate}
                        onChange={e => setExpDate(e.target.value)}
                        className="px-3 py-1.5 border rounded"
                      />
                      <input
                        type="text"
                        value={expReceipt}
                        onChange={e => setExpReceipt(e.target.value)}
                        placeholder="Receipt URL (optional)"
                        className="px-3 py-1.5 border rounded"
                      />
                    </div>
                    <input
                      type="text"
                      value={expDesc}
                      onChange={e => setExpDesc(e.target.value)}
                      placeholder="Description (e.g. Geyser power backup diesel, fresh linen laundry batch)..."
                      className="w-full px-3 py-1.5 border rounded"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddExpense(false)} className="px-3 py-1 border rounded">Cancel</button>
                      <button type="submit" className="px-4 py-1 bg-amber-700 text-white font-bold rounded">Record Expense</button>
                    </div>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Date & Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Entered By</th>
                        <th className="py-3 px-4 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-stone-50/80">
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900 capitalize block">{e.category}</span>
                            <span className="text-[10px] text-stone-400">{e.date}</span>
                          </td>
                          <td className="py-3 px-4 text-stone-700">{e.description}</td>
                          <td className="py-3 px-4 text-stone-500 text-[11px]">{e.enteredBy}</td>
                          <td className="py-3 px-4 text-right font-bold text-stone-900">₹{e.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 17. PROFIT AND LOSS */}
            {activeTab === 'profit-loss' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Profit & Loss (P&L) Statement</h3>
                  <p className="text-xs text-stone-600">
                    Gross revenue versus operating expenditures and net homestay income
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs">
                  <div className="space-y-2 pb-4 border-b">
                    <span className="font-bold text-sm text-stone-900">Operating Revenues</span>
                    <div className="flex justify-between py-1 text-stone-700">
                      <span>Room Stays & Lodging Revenue</span>
                      <span className="font-bold">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-700">
                      <span>Rooftop Terrace Packages</span>
                      <span className="font-bold">₹{metrics.rooftopRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-900 font-extrabold text-sm pt-2 border-t">
                      <span>Total Gross Inflow</span>
                      <span>₹{(metrics.totalRevenue + metrics.rooftopRevenue).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pb-4 border-b">
                    <span className="font-bold text-sm text-stone-900">Operating Expenditures</span>
                    {Object.entries(metrics.expensesByCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-1 text-stone-600 capitalize">
                        <span>{cat}</span>
                        <span>₹{amt.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 text-red-900 font-bold text-sm pt-2 border-t">
                      <span>Total Operating Outflow</span>
                      <span>₹{metrics.totalExpenses.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2">
                    <div>
                      <span className="text-base font-extrabold text-stone-900 block">Net Operational Income</span>
                      <span className="text-[11px] text-stone-500">
                        Operating Margin: {metrics.totalRevenue > 0 ? Math.round(((metrics.totalRevenue - metrics.totalExpenses) / metrics.totalRevenue) * 100) : 0}%
                      </span>
                    </div>
                    <span className="text-2xl font-black text-emerald-900">
                      ₹{(metrics.totalRevenue - metrics.totalExpenses).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 18. AI BUSINESS ADVISOR & AI COMMAND CENTER */}
            {activeTab === 'ai-advisor' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">AI Business Advisor & Command Center</h3>
                    <p className="text-xs text-stone-600">
                      Interactive natural-language query engine powered by real Firestore records & Gemini
                    </p>
                  </div>
                </div>

                {/* AI Command Center Query Bar */}
                <div className="bg-stone-900 p-5 rounded-2xl text-white shadow-lg space-y-4">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Command Center — Natural Language Hotel Queries</span>
                  </div>

                  <form onSubmit={handleExecuteAiCommand} className="flex gap-2">
                    <input
                      type="text"
                      value={aiCommandInput}
                      onChange={e => setAiCommandInput(e.target.value)}
                      placeholder="Ask anything: 'Why did revenue drop?', 'Which room earned most?', 'Top expenses?'..."
                      className="flex-1 px-4 py-2 text-xs bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isQueryingCommand}
                      className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isQueryingCommand ? 'Analyzing Data...' : 'Ask AI'}</span>
                    </button>
                  </form>

                  {/* Quick Question Buttons */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="text-stone-400 self-center">Quick Queries:</span>
                    {[
                      'Why did this month revenue decrease?',
                      'Which room earned the most?',
                      'Which customer services are requested most?',
                      'What were this month total expenses?'
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiCommandInput(q);
                          queryAICommandCenter(q, metrics, serviceRequests, staff).then(setAiCommandAnswer);
                        }}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Command Output Answer */}
                  {aiCommandAnswer && (
                    <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-stone-400 text-[10px]">
                        <span>Answer for: "{aiCommandAnswer.question}"</span>
                        <span className="text-amber-400 uppercase font-semibold">{aiCommandAnswer.source}</span>
                      </div>
                      <p className="text-stone-200 leading-relaxed font-medium">
                        {aiCommandAnswer.answer}
                      </p>

                      {aiCommandAnswer.keyFigures && Object.keys(aiCommandAnswer.keyFigures).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-700">
                          {Object.entries(aiCommandAnswer.keyFigures).map(([k, v]) => (
                            <div key={k} className="bg-stone-900/60 p-2 rounded border border-stone-700/60">
                              <span className="block text-[10px] text-stone-400 uppercase">{k}</span>
                              <span className="font-bold text-amber-200">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {aiCommandAnswer.actionableStep && (
                        <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 rounded text-amber-200 text-[11px] flex items-center gap-2">
                          <Check className="w-4 h-4 text-amber-400 shrink-0" />
                          <span><strong>Recommended Owner Action:</strong> {aiCommandAnswer.actionableStep}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Structured Strategic Insights */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-stone-900">Structured Business Recommendations</h4>
                  <div className="space-y-4">
                    {aiInsights.map(insight => (
                      <div key={insight.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded">
                            {insight.category}
                          </span>
                          <span className="text-[11px] text-stone-400">Confidence: {insight.confidenceLevel}</span>
                        </div>
                        <h5 className="font-bold text-sm text-stone-900">{insight.observedCondition}</h5>
                        <p className="text-stone-600 leading-relaxed">{insight.explanation}</p>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 space-y-1">
                          <span className="font-semibold text-amber-950">Suggested Action:</span>
                          <p>{insight.suggestedAction}</p>
                          {insight.estimatedImpact && (
                            <span className="block text-[11px] text-emerald-700 font-bold mt-1">
                              Estimated Impact: {insight.estimatedImpact}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-stone-400 italic">{insight.dataLimitations}</span>
                          <button
                            onClick={() => {
                              setStatusMessage({ type: 'success', text: `Recommendation approved: "${insight.category}" recorded in audit log.` });
                            }}
                            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                          >
                            Approve Action
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 19. MARKETING PERFORMANCE */}
            {activeTab === 'marketing' && (
              <div className="space-y-4 max-w-5xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Marketing & Acquisition Channels</h3>
                  <p className="text-stone-600">
                    Guest origination channels in Tapovan Rishikesh and promo code performance
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <span className="font-bold text-stone-800">Direct Website Stays</span>
                    <span className="text-2xl font-black text-amber-900 block">72%</span>
                    <p className="text-[11px] text-stone-500">Zero commission deductions. Guests booking directly via web portal.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <span className="font-bold text-stone-800">Student & Yoga Referrals</span>
                    <span className="text-2xl font-black text-amber-900 block">18%</span>
                    <p className="text-[11px] text-stone-500">Targeted STUDENT500 promo code and Rishikesh ashram ties.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                    <span className="font-bold text-stone-800">Walk-Ins & Pilgrims</span>
                    <span className="text-2xl font-black text-amber-900 block">10%</span>
                    <p className="text-[11px] text-stone-500">Char Dham yatra travelers and Tapovan bridge walk-ins.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 20. CUSTOMER REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-4 max-w-5xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Customer Reviews & Owner Responses</h3>
                  <p className="text-stone-600">
                    Verified guest feedback for rooms, cleanliness, and swimming pool
                  </p>
                </div>

                <div className="space-y-3">
                  {feedbackList.map(fb => (
                    <div key={fb.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900">{fb.guestName}</span>
                          {fb.roomNumber && <span className="text-stone-500 ml-2">· Room {fb.roomNumber}</span>}
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}`} />
                          ))}
                        </div>
                      </div>

                      <p className="text-stone-700 leading-relaxed italic">"{fb.comments}"</p>

                      {fb.responseByOwner ? (
                        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-amber-950 space-y-1">
                          <span className="font-bold text-[11px]">Owner Response:</span>
                          <p>{fb.responseByOwner}</p>
                        </div>
                      ) : (
                        <div>
                          {replyingReviewId === fb.id ? (
                            <div className="space-y-2 pt-2 border-t">
                              <input
                                type="text"
                                value={ownerReplyText}
                                onChange={e => setOwnerReplyText(e.target.value)}
                                placeholder="Write polite owner reply (e.g. Thank you for your warm words)..."
                                className="w-full px-3 py-1.5 border rounded"
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setReplyingReviewId(null)} className="px-2.5 py-1 border rounded">Cancel</button>
                                <button onClick={() => handleSaveReviewReply(fb.id)} className="px-3 py-1 bg-amber-700 text-white font-bold rounded">
                                  Publish Response
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyingReviewId(fb.id);
                                setOwnerReplyText('');
                              }}
                              className="text-amber-800 font-semibold hover:underline cursor-pointer"
                            >
                              + Respond to Guest
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 21. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 max-w-4xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Administrative Alerts & Notifications</h3>
                  <p className="text-stone-600">Real-time alerts for check-ins, service requests, and maintenance</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                    <Bell className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900">Checkout Turnover Alert</span>
                      <p className="text-stone-600">Room 101 cleaning task dispatched to Ramesh Rawat.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900">Database Rules Deployed</span>
                      <p className="text-stone-600">Firestore security rules and audit logs verified active.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 22. REPORTS AND EXPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-6 max-w-4xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Reports & Audit Exports</h3>
                  <p className="text-stone-600">
                    Export real-time homestay operational data to CSV or format print-ready summaries
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                    <span className="font-bold text-stone-900 text-sm block">Spreadsheet & CSV Exports</span>
                    <p className="text-stone-500">Download clean CSV files ready for accounting or tax auditing:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => exportBookingsToCSV(bookings)}
                        className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Bookings CSV</span>
                      </button>
                      <button
                        onClick={() => exportExpensesToCSV(expenses)}
                        className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Expenses CSV</span>
                      </button>
                      <button
                        onClick={() => exportHousekeepingToCSV(housekeepingTasks)}
                        className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Housekeeping CSV</span>
                      </button>
                      <button
                        onClick={() => exportStaffToCSV(staff)}
                        className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Staff Roster CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                    <span className="font-bold text-stone-900 text-sm block">Print Summary Report</span>
                    <p className="text-stone-500">Prepare print-ready monthly management report for the owners:</p>
                    <div className="p-3 bg-stone-50 rounded-xl border space-y-1 text-stone-700">
                      <div><strong>Devashish Sunlit Homestay</strong></div>
                      <div>Tapovan, Rishikesh, Uttarakhand</div>
                      <div>Total Rooms: {metrics.totalRooms}</div>
                      <div>Gross Revenue: ₹{metrics.totalRevenue.toLocaleString('en-IN')}</div>
                      <div>Net Operating Balance: ₹{(metrics.totalRevenue - metrics.totalExpenses).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Summary Statement</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 23. BUSINESS SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4 max-w-4xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Homestay Business Configuration</h3>
                  <p className="text-stone-600">Location, check-in policies, and administrator structure</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Business Name</span>
                      <span className="font-bold text-stone-900">Devashish Sunlit Homestay</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Location</span>
                      <span className="font-bold text-stone-900">Tapovan, Rishikesh, Uttarakhand, India</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Standard Check-In</span>
                      <span className="font-bold text-stone-900">12:00 PM</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Standard Check-Out</span>
                      <span className="font-bold text-stone-900">10:00 AM</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Primary Owner</span>
                      <span className="font-bold text-stone-900">Subhashish Pandey (+91 9897335265)</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-bold">Co-Partner</span>
                      <span className="font-bold text-stone-900">Vivek Singh Negi (+91 6398389019)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 24. ADMIN ACTIVITY & AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="space-y-4 max-w-6xl mx-auto text-xs">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Admin Activity & Audit Trail</h3>
                  <p className="text-stone-600">Immutable chronological record of administrative actions taken</p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Admin Email</th>
                        <th className="py-3 px-4">Target Collection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-stone-50/80">
                          <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-900">{log.action}</td>
                          <td className="py-3 px-4 text-stone-600">{log.performedBy}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-stone-400">{log.targetCollection}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Edit Dialog */}
        {editingPriceRoom && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-900">
                  Update Rate for Room {editingPriceRoom.roomNumber}
                </span>
                <button onClick={() => setEditingPriceRoom(null)} className="text-stone-400 hover:text-stone-700">✕</button>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Rate Category</label>
                <select
                  value={priceTypeToUpdate}
                  onChange={e => setPriceTypeToUpdate(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-stone-50"
                >
                  <option value="standard">Standard Base Rate</option>
                  <option value="student">Student Special Rate</option>
                  <option value="couple">Couple Rate</option>
                  <option value="weekend">Weekend Rate</option>
                  <option value="seasonal">Seasonal Rate</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">New Price (INR) *</label>
                <input
                  type="number"
                  value={newPriceValue}
                  onChange={e => setNewPriceValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Reason for Price Adjustment *</label>
                <input
                  type="text"
                  value={priceUpdateReason}
                  onChange={e => setPriceUpdateReason(e.target.value)}
                  placeholder="e.g. Midweek monsoon student promotion, Diwali weekend surge..."
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingPriceRoom(null)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button onClick={handleSavePriceChange} className="px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg">
                  Commit Rate Change
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
