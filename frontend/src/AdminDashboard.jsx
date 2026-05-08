import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, UploadCloud, GraduationCap, BookOpen, CheckCircle, AlertCircle, LayoutDashboard, FileText, Search, LogOut, Menu } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import ScrollToTop from './ScrollToTop'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [activeTab, setActiveTab] = useState('faculty')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false)
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', department: '', division: '', school: '', panel: '', is_primary: false })

  const [isLtcModalOpen, setIsLtcModalOpen] = useState(false)
  const [ltcForm, setLtcForm] = useState({ name: '', email: '', role_type: 'member' })

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState({ name: '', email: '', department: '', semester: '', division: '', school: '', panel: '' })

  const [bulkData, setBulkData] = useState({ faculty: [], students: [], errors: [] })
  const [bulkInsuranceData, setBulkInsuranceData] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false)

  const [docForm, setDocForm] = useState({ name: '', url: '', target_role: 'all' })
  const [facultySearch, setFacultySearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedUserForFeedback, setSelectedUserForFeedback] = useState(null)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])

  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const handleViewFeedback = async (userId, userName) => {
    setSelectedUserForFeedback({ id: userId, name: userName })
    setIsFeedbackModalOpen(true)
    try {
      const res = await fetch(`http://localhost:5001/api/admin/feedback?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setFeedbackList(data.feedback || [])
      }
    } catch (err) {
      alert('Failed to fetch feedback.')
    }
  }

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchUsers()
    fetchDocuments()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to fetch users', err)
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setDocuments(data.documents || [])
    } catch (err) {
      console.error('Failed to fetch documents', err)
    }
  }

  const faculties = users.filter(u => u.role === 'faculty' &&
    (u.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      u.email.toLowerCase().includes(facultySearch.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(facultySearch.toLowerCase()))))

  const students = users.filter(u => u.role === 'student' &&
    (u.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(studentSearch.toLowerCase()))))
  const ltcMembers = users.filter(u => u.role === 'ltc_member')

  const handleAddFaculty = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:5001/api/admin/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(facultyForm)
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        setIsFacultyModalOpen(false)
        setFacultyForm({ name: '', email: '', department: '', division: '', school: '', panel: '', is_primary: false })
        fetchUsers()
      } else {
        alert(data.message || 'Failed to add faculty')
      }
    } catch (err) {
      alert('Error adding faculty')
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:5001/api/users/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(studentForm)
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        setIsStudentModalOpen(false)
        setStudentForm({ name: '', email: '', department: '', semester: '', division: '', school: '', panel: '' })
        fetchUsers()
      } else {
        alert(data.message || 'Failed to add student')
      }
    } catch (err) {
      alert('Error adding student')
    }
  }

  const handleAddLtcMember = async (e) => {
    e.preventDefault()
    try {
      const url = 'http://localhost:5001/api/admin/bulk-upload';
      const actualRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ users: [{ name: ltcForm.name, email: ltcForm.email, role: 'ltc_member', department: ltcForm.role_type }] })
      })
      const data = await actualRes.json()
      if (actualRes.ok) {
        alert("LTC Member added successfully.")
        setIsLtcModalOpen(false)
        setLtcForm({ name: '', email: '', role_type: 'member' })
        fetchUsers()
      } else {
        alert(data.message || 'Failed to add LTC Member')
      }
    } catch (err) {
      alert('Error adding LTC member')
    }
  }

  const handleUploadDocument = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(docForm)
      })
      if (res.ok) {
        alert('Document uploaded specifically for ' + docForm.target_role)
        setDocForm({ name: '', url: '', target_role: 'all' })
        fetchDocuments()
      }
    } catch (err) { }
  }

  const handleUpdatePanel = async (userId, newPanel) => {
    try {
      const res = await fetch('http://localhost:5001/api/admin/update-panel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId, panel: newPanel })
      })
      if (res.ok) {
        alert('Panel assignment updated!')
        fetchUsers()
      } else {
        alert('Failed to update panel.')
      }
    } catch (err) {
      alert('Error updating panel')
    }
  }

  const handleUpdateDivision = async (userId, newDivision) => {
    try {
      const res = await fetch('http://localhost:5001/api/admin/update-division', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId, division: newDivision })
      })
      if (res.ok) fetchUsers()
      else alert('Failed to update division.')
    } catch (err) {
      alert('Error updating division')
    }
  }

  const handleUpdateInsurance = async (userId, insuranceValue) => {
    try {
      const res = await fetch('http://localhost:5001/api/admin/insurance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId, insurance: insuranceValue === 'true' })
      })
      if (res.ok) {
        alert('Insurance state updated successfully!')
        fetchUsers()
      } else {
        alert('Failed to update insurance status.')
      }
    } catch (err) {
      alert('Error updating insurance')
    }
  }

  const parseData = (parsedData) => {
    const parsedFaculties = []
    const parsedStudents = []
    const parseErrors = []

    parsedData.forEach((row, index) => {
      const normalizedRow = {}
      for (const key in row) {
        const cleanKey = key.replace(/^\uFEFF/, '').toLowerCase().trim()
        normalizedRow[cleanKey] = row[key]
      }

      const role = (normalizedRow.role || '').toLowerCase()
      const name = normalizedRow.name || normalizedRow.full_name
      if (!name || !normalizedRow.email || !role) {
        parseErrors.push(`Row ${index + 1}: Missing name/full_name, email, or role.`)
        return
      }
      normalizedRow.name = name

      if (role === 'faculty') {
        parsedFaculties.push(normalizedRow)
      } else if (role === 'student') {
        parsedStudents.push(normalizedRow)
      } else {
        parseErrors.push(`Row ${index + 1}: Invalid role "${role}". Expected 'faculty' or 'student'.`)
      }
    })

    setBulkData({ faculty: parsedFaculties, students: parsedStudents, errors: parseErrors })
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBulkData({ faculty: [], students: [], errors: [] })
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => parseData(results.data),
        error: () => alert('Error parsing CSV file.')
      })
    } else if (fileName.endsWith('.xlsx')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const bstr = evt.target.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const wsname = workbook.SheetNames[0]
        const ws = workbook.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        parseData(data)
      }
      reader.onerror = () => alert('Error parsing XLSX file.')
      reader.readAsBinaryString(file)
    } else {
      alert('Unsupported file format. Please upload a CSV or XLSX file.')
    }
  }

  const submitBulkUpload = async () => {
    const allUsersToUpload = [...bulkData.faculty, ...bulkData.students]
    if (allUsersToUpload.length === 0) return alert('No valid data to upload.')

    setIsUploading(true)
    try {
      const res = await fetch('http://localhost:5001/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ users: allUsersToUpload })
      })
      const data = await res.json()
      alert(data.message)
      if (res.ok) {
        setBulkData({ faculty: [], students: [], errors: [] })
        fetchUsers()
        setActiveTab('faculty')
      }
    } catch (err) {
      alert('Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const processInsuranceData = (data) => {
    if (!data || data.length === 0) {
      alert('The file appears to be empty or could not be read.');
      return;
    }
    const formatted = data.map(row => {
      const lowerRow = {}
      for (let k in row) {
        if (!k) continue;
        const cleanKey = k.replace(/^\uFEFF/, '').toLowerCase().trim().replace(/['"]+/g, '')
        lowerRow[cleanKey] = row[k]
      }
      return lowerRow
    })
    setBulkInsuranceData(formatted)
  }

  const handleInsuranceFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBulkInsuranceData([])
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => processInsuranceData(results.data),
        error: () => alert('Error parsing CSV file.')
      })
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result
          const workbook = XLSX.read(bstr, { type: 'binary' })
          const wsname = workbook.SheetNames[0]
          const ws = workbook.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws)
          processInsuranceData(data)
        } catch (err) {
          alert('Error parsing Excel file.')
        }
      }
      reader.onerror = () => alert('Error reading Excel file.')
      reader.readAsBinaryString(file)
    } else {
      alert('Unsupported format. Please upload CSV or XLSX for Insurance data.')
    }
    // reset input so the exact same file can be clicked again
    e.target.value = null;
  }

  const submitBulkInsurance = async () => {
    if (bulkInsuranceData.length === 0) return alert('No valid insurance data to upload.')
    setIsUploadingInsurance(true)
    try {
      const res = await fetch('http://localhost:5001/api/admin/bulk-insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ users: bulkInsuranceData })
      })
      const data = await res.json()
      alert(data.message)
      if (res.ok) {
        setBulkInsuranceData([])
        fetchUsers()
      }
    } catch (err) {
      alert('Insurance upload failed.')
    } finally {
      setIsUploadingInsurance(false)
    }
  }

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Sidebar Navigation */}
      {isMobile && isSidebarOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="sidebar" style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0, bottom: 0, zIndex: 1000,
        transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100vh'
      }}>
        {/* Header */}
        <div className="sidebar-header">
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
          )}
          <img src="/ltc.png" alt="LTC Logo" className="sidebar-logo" />
          <p className="sidebar-portal-label">Admin Portal</p>
          <p className="sidebar-sub-label">{currentUser?.name || 'Administrator'}</p>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Management</p>
          <button
            className={`sidebar-item ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => { setActiveTab('faculty'); if (isMobile) setIsSidebarOpen(false); }}
          >
            <BookOpen size={16} /> Manage Faculty
          </button>
          <button
            className={`sidebar-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => { setActiveTab('students'); if (isMobile) setIsSidebarOpen(false); }}
          >
            <GraduationCap size={16} /> Manage Students
          </button>
          <button
            className={`sidebar-item ${activeTab === 'ltcmembers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ltcmembers'); if (isMobile) setIsSidebarOpen(false); }}
          >
            <Users size={16} /> LTC Members
          </button>

          <div className="sidebar-separator" />
          <p className="sidebar-section-label">Data</p>
          <button
            className={`sidebar-item ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => { setActiveTab('bulk'); if (isMobile) setIsSidebarOpen(false); }}
          >
            <UploadCloud size={16} /> Bulk Upload
          </button>
          <button
            className={`sidebar-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => { setActiveTab('documents'); if (isMobile) setIsSidebarOpen(false); }}
          >
            <FileText size={16} /> Documents & SOPs
          </button>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-item logout" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, padding: isMobile ? '10px' : '30px' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 style={{ fontSize: '18px', margin: 0 }}>Admin Portal</h1>
          </div>
        )}

        {activeTab === 'faculty' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BookOpen className="text-primary" />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Faculty Database</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Manage and assign faculty members to panels.</p>
                </div>
              </div>
              <button className="btn" style={{ width: isMobile ? '100%' : 'auto' }} onClick={() => setIsFacultyModalOpen(true)}>
                <Plus size={20} /> Assign Faculty
              </button>
            </div>

            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search faculty..."
                className="input-field"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Division</th><th>School</th><th>Department</th><th>Assigned Panels</th><th>Role Type</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {faculties.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td><td>{u.name}</td><td>{u.email}</td>
                      <td>{u.division || '-'}</td><td>{u.school || '-'}</td><td>{u.department || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select className="input-field" style={{ margin: 0, padding: '4px 8px', fontSize: '14px', width: 'auto' }}
                            value={u.panel || ''} onChange={(e) => handleUpdatePanel(u.id, e.target.value)}>
                            <option value="">Unassigned</option>
                            <option value="PA">PA</option>
                            <option value="PB">PB</option>
                            <option value="PC">PC</option>
                            <option value="PD">PD</option>
                          </select>
                        </div>
                      </td>
                      <td><span className={`badge ${u.is_primary ? 'badge-primary' : 'badge-secondary'}`}>{u.is_primary ? 'Primary' : 'Secondary'}</span></td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleViewFeedback(u.id, u.name)}>
                          Feedback
                        </button>
                      </td>
                    </tr>
                  ))}
                  {faculties.length === 0 && <tr><td colSpan="9" style={{ textAlign: 'center' }}>No faculty found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GraduationCap className="text-primary" />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Student Database</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>View and onboard students.</p>
                </div>
              </div>
              <button className="btn" style={{ width: isMobile ? '100%' : 'auto' }} onClick={() => setIsStudentModalOpen(true)}>
                <Plus size={20} /> Onboard Student
              </button>
            </div>

            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search students..."
                className="input-field"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Division</th><th>School</th><th>Panel</th><th>Insurance</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {students.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td><td>{u.name}</td><td>{u.email}</td>
                      <td>
                        <select className="input-field" style={{ margin: 0, padding: '4px 8px', width: 'auto' }}
                          value={u.division || ''} onChange={(e) => handleUpdateDivision(u.id, e.target.value)}>
                          <option value="">-</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                          <option value="F">F</option>
                          <option value="DIV 1">DIV 1</option>
                          <option value="DIV 2">DIV 2</option>
                          <option value="DIV 3">DIV 3</option>
                        </select>
                      </td>
                      <td>{u.school || '-'}</td>
                      <td>
                        <select className="input-field" style={{ margin: 0, padding: '4px 8px', width: 'auto' }}
                          value={u.panel || ''} onChange={(e) => handleUpdatePanel(u.id, e.target.value)}>
                          <option value="">Unassigned</option>
                          <option value="PA">PA</option>
                          <option value="PB">PB</option>
                          <option value="PC">PC</option>
                          <option value="PD">PD</option>
                        </select>
                      </td>
                      <td>
                        <select className="input-field" style={{ margin: 0, padding: '4px 8px', width: 'auto' }}
                          value={u.insurance ? 'true' : 'false'} onChange={(e) => handleUpdateInsurance(u.id, e.target.value)}>
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleViewFeedback(u.id, u.name)}>
                          Feedback
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center' }}>No students found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Section 1: Users Data */}
            <div className="glass-card animate-fade-in" style={{ padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <UploadCloud className="text-primary" size={24} />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Bulk Import Users Data</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Import faculty and students via CSV or Excel.</p>
                </div>
              </div>

              {/* Modern Upload Box */}
              <div 
                style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '16px', 
                  padding: '40px 20px', 
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => document.getElementById('bulk-file-input').click()}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Click to upload or drag and drop</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Support for .csv, .xlsx files</p>
                </div>
                <input 
                  id="bulk-file-input"
                  type="file" 
                  accept=".csv, .xlsx" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '13px' }}>
                  Required columns: <strong>name, email, role, department, semester, division, school, panel, is_primary, nri</strong>.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  📌 <strong>nri</strong>: Set to <code>yes</code> or <code>true</code> to mark a student as NRI.
                </p>
              </div>

              {bulkData.errors.length > 0 && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600' }}>Errors in file:</h3>
                  <ul style={{ paddingLeft: '20px', fontSize: '12px' }}>
                    {bulkData.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              {(bulkData.faculty.length > 0 || bulkData.students.length > 0) && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#0f172a' }}>
                    Found <strong>{bulkData.faculty.length}</strong> faculties and <strong>{bulkData.students.length}</strong> students ready.
                  </p>
                  <button className="btn" onClick={submitBulkUpload} disabled={isUploading}>
                    {isUploading ? 'Allocating...' : 'Confirm & Ingest Structure'}
                  </button>
                </div>
              )}
            </div>

            {/* Section 2: Insurance Data */}
            <div className="glass-card animate-fade-in" style={{ padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <UploadCloud className="text-primary" size={24} />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Bulk Import Insurance Data</h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Update insurance status via CSV or Excel.</p>
                </div>
              </div>

              {/* Modern Upload Box */}
              <div 
                style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '16px', 
                  padding: '40px 20px', 
                  background: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => document.getElementById('insurance-file-input').click()}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Click to upload or drag and drop</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Support for .csv, .xlsx files</p>
                </div>
                <input 
                  id="insurance-file-input"
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  onChange={handleInsuranceFileUpload} 
                  style={{ display: 'none' }} 
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Required columns: <strong>email</strong> and optionally <strong>insurance</strong> (yes/no).
                </p>
              </div>

              {bulkInsuranceData.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#0f172a' }}>
                    Found <strong>{bulkInsuranceData.length}</strong> insurance records ready.
                  </p>
                  <button className="btn" style={{ background: 'var(--secondary)' }} onClick={submitBulkInsurance} disabled={isUploadingInsurance}>
                    {isUploadingInsurance ? 'Uploading...' : 'Confirm & Ingest Insurance'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ltcmembers' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users className="text-primary" />
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>LTC Members Database</h2>
              </div>
              <button className="btn" style={{ width: isMobile ? '100%' : 'auto' }} onClick={() => setIsLtcModalOpen(true)}>
                <Plus size={20} /> Add Member
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Role/Type</th></tr>
                </thead>
                <tbody>
                  {ltcMembers.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.department || 'LTC Member'}</td>
                    </tr>
                  ))}
                  {ltcMembers.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No LTC members found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText className="text-primary" />
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Document & SOP Hub</h2>
              </div>
            </div>

            <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', marginBottom: '32px' }}>
              <input type="text" placeholder="Doc Name (e.g., LTC SOP)" className="input-field" style={{ margin: 0 }} required value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
              <input type="text" placeholder="URL Link" className="input-field" style={{ margin: 0 }} required value={docForm.url} onChange={e => setDocForm({ ...docForm, url: e.target.value })} />
              <select className="input-field" style={{ margin: 0, width: isMobile ? '100%' : 'auto' }} value={docForm.target_role} onChange={e => setDocForm({ ...docForm, target_role: e.target.value })}>
                <option value="all">All Roles</option>
                <option value="faculty">Faculty Only</option>
                <option value="student">Students Only</option>
              </select>
              <button type="submit" className="btn" style={{ width: isMobile ? '100%' : 'auto' }}>Share Document</button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>ID</th><th>Document Title</th><th>Link</th><th>Target Roles</th></tr></thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id}>
                      <td>#{d.id}</td><td>{d.name}</td><td><a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>View File</a></td><td>{d.target_role}</td>
                    </tr>
                  ))}
                  {documents.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No documents found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isFacultyModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsFacultyModalOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '24px' }}>Assign Faculty</h2>
            <form onSubmit={handleAddFaculty}>
              <input type="text" placeholder="Full Name" className="input-field" required value={facultyForm.name} onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })} />
              <input type="email" placeholder="Email Address" className="input-field" required value={facultyForm.email} onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })} />

              <h3 style={{ fontSize: '14px', margin: '16px 0 8px' }}>Organizational Structure</h3>
              <input type="text" placeholder="Division (e.g. DIV I)" className="input-field" value={facultyForm.division} onChange={e => setFacultyForm({ ...facultyForm, division: e.target.value })} />
              <input type="text" placeholder="School (e.g. SoCSE)" className="input-field" value={facultyForm.school} onChange={e => setFacultyForm({ ...facultyForm, school: e.target.value })} />
              <input type="text" placeholder="Department" className="input-field" required value={facultyForm.department} onChange={e => setFacultyForm({ ...facultyForm, department: e.target.value })} />
              <select className="input-field" value={facultyForm.panel} onChange={e => setFacultyForm({ ...facultyForm, panel: e.target.value })}>
                <option value="">-- Select Panel --</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PC">PC</option>
                <option value="PD">PD</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
                <input type="checkbox" id="is_primary" checked={facultyForm.is_primary} onChange={e => setFacultyForm({ ...facultyForm, is_primary: e.target.checked })} />
                <label htmlFor="is_primary">Is this a Primary Faculty Member?</label>
              </div>

              <button type="submit" className="btn" style={{ width: '100%' }}>Create Faculty Record</button>
            </form>
          </div>
        </div>
      )}

      {isStudentModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsStudentModalOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '24px' }}>Onboard Student</h2>
            <form onSubmit={handleAddStudent}>
              <input type="text" placeholder="Full Name" className="input-field" required value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
              <input type="email" placeholder="Email Address" className="input-field" required value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
              <input type="text" placeholder="Semester (e.g. 1st)" className="input-field" required value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: e.target.value })} />

              <h3 style={{ fontSize: '14px', margin: '16px 0 8px' }}>Organizational Structure</h3>
              <input type="text" placeholder="Division (e.g. DIV I)" className="input-field" value={studentForm.division} onChange={e => setStudentForm({ ...studentForm, division: e.target.value })} />
              <input type="text" placeholder="School" className="input-field" value={studentForm.school} onChange={e => setStudentForm({ ...studentForm, school: e.target.value })} />
              <input type="text" placeholder="Department" className="input-field" value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })} />
              <select className="input-field" required value={studentForm.panel} onChange={e => setStudentForm({ ...studentForm, panel: e.target.value })}>
                <option value="">-- Select Panel --</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PC">PC</option>
                <option value="PD">PD</option>
              </select>

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }}>Onboard to Program</button>
            </form>
          </div>
        </div>
      )}

      {isLtcModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsLtcModalOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '24px' }}>Add LTC Member</h2>
            <form onSubmit={handleAddLtcMember}>
              <input type="text" placeholder="Full Name" className="input-field" required value={ltcForm.name} onChange={e => setLtcForm({ ...ltcForm, name: e.target.value })} />
              <input type="email" placeholder="Email Address" className="input-field" required value={ltcForm.email} onChange={e => setLtcForm({ ...ltcForm, email: e.target.value })} />
              <input type="text" placeholder="Member Type / Role" className="input-field" value={ltcForm.role_type} onChange={e => setLtcForm({ ...ltcForm, role_type: e.target.value })} />
              <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }}>Add Member</button>
            </form>
          </div>
        </div>
      )}

      {isFeedbackModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsFeedbackModalOpen(false)}>&times;</button>

            <div id="feedback-report" style={{ padding: '40px', background: 'white', color: '#333', borderRadius: '8px', border: '1px solid #ddd', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', bottom: '10px', border: '1px solid #e2e8f0', pointerEvents: 'none' }}></div>

              <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #1a365d', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <img src="/ltc.png" alt="LTC Logo" style={{ height: '60px' }} />
                </div>
                <p style={{ color: '#d97706', fontSize: '16px', fontWeight: 'bold' }}>आत्मानं विद्धि</p>
                <h2 style={{ fontSize: '20px', marginTop: '15px', color: '#333', textTransform: 'uppercase' }}>Official Feedback Report</h2>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '14px' }}>
                <div>
                  <p><strong>Subject Name:</strong> {selectedUserForFeedback?.name}</p>
                  <p><strong>Subject ID:</strong> #{selectedUserForFeedback?.id}</p>
                  <p><strong>Role:</strong> {selectedUserForFeedback?.role}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p><strong>Report Date:</strong> {new Date().toLocaleDateString()}</p>
                  <p><strong>Status:</strong> Confidential</p>
                </div>
              </div>

              {feedbackList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                  No feedback records found for this subject.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {feedbackList.map(f => (
                    <div key={f.id} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <span><strong>Category:</strong> {f.category || 'General'}</span>
                        <span>{new Date(f.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', color: '#1e293b', marginBottom: '12px' }}>{f.feedback_text}</p>
                      {f.additional_notes && (
                        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '13px', color: '#475569' }}>
                          <strong>Additional Notes:</strong> {f.additional_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <div>
                  <div style={{ width: '200px', borderTop: '1px solid #94a3b8', marginBottom: '5px' }}></div>
                  <p>Authorized Signature</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p>© Life Transformation Centre</p>
                  <p>This is a system generated report.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setIsFeedbackModalOpen(false)}>Close</button>
              <button className="btn" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
      <ScrollToTop />
    </div>
  )
}
