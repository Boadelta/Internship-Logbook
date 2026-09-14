import os
from datetime import datetime, date
from functools import wraps

from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    set_access_cookies,
    unset_jwt_cookies
)
from supabase import create_client, Client
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()
from mailer import generate_otp, send_activation_email



# ============================================================
# FLASK CONFIGURATION
# ============================================================

app = Flask(__name__)

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from environment variables.")

app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24  # 24 hours
app.config["JWT_TOKEN_LOCATION"]=["cookies"]

jwt = JWTManager(app)

# Development CORS.
# Restrict this to your frontend domain in production.
CORS(app)


# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_KEY is missing."
    )

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ============================================================
# RESPONSE HELPERS
# ============================================================

def success(message, data=None, status_code=200):
    response = {
        "success": True,
        "message": message
    }

    if data is not None:
        response["data"] = data

    return jsonify(response), status_code


def error(message, status_code=400, details=None):
    response = {
        "success": False,
        "message": message
    }

    # Do not expose database errors in production.
    if details is not None and app.debug:
        response["details"] = str(details)

    return jsonify(response), status_code


# ============================================================
# AUTHORIZATION DECORATOR
# ============================================================

def role_required(*allowed_roles):

    def decorator(function):

        @wraps(function)
        @jwt_required()
        def wrapper(*args, **kwargs):

            claims = get_jwt()
            role = claims.get("role")

            if role not in allowed_roles:
                return error(
                    "You do not have permission to perform this action.",
                    403
                )

            return function(*args, **kwargs)

        return wrapper

    return decorator


# ============================================================
# HELPER - CURRENT USER
# ============================================================

def get_current_user():

    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    result = (
        supabase
        .table("users")
        .select("user_id, username, email, role, created_at")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]


# ============================================================
# HELPER - CURRENT STUDENT
# ============================================================

def get_current_student():

    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    result = (
        supabase
        .table("student")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]


# ============================================================
# HELPER - CURRENT SUPERVISOR
# ============================================================

def get_current_supervisor():

    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    result = (
        supabase
        .table("supervisor")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]


# ============================================================
# HELPER - VALIDATE DATE
# ============================================================

def validate_date(value):

    if not value:
        return None

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except (ValueError, AttributeError):
        return None


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def index():

    return render_template('index.html')


@app.route("/admin", methods=["GET"])
@role_required('admin')
def admin():

    # ----------------------------------------------------
    # STUDENTS
    # ----------------------------------------------------

    student_result = supabase.table("student").select("*").execute()
    students = student_result.data
    student_by_id = {s["student_id"]: s for s in students}

    # ----------------------------------------------------
    # PLACEMENTS + COMPANIES
    # ----------------------------------------------------

    placement_result = supabase.table("internship_placement").select("*").execute()
    placements = placement_result.data
    placement_by_student = {p["student_id"]: p for p in placements}

    company_result = supabase.table("company").select("*").execute()
    companies = company_result.data
    company_by_id = {c["company_id"]: c for c in companies}

    for student in students:
        placement = placement_by_student.get(student["student_id"])
        if placement:
            company = company_by_id.get(placement["company_id"])
            student["company_name"] = company["company_name"] if company else None
            student["placement_status"] = "Active"
        else:
            student["company_name"] = None
            student["placement_status"] = "Pending"

    # ----------------------------------------------------
    # SUPERVISORS
    # ----------------------------------------------------

    supervisor_result = supabase.table("supervisor").select("*").execute()
    supervisors = supervisor_result.data
    supervisor_by_id = {sup["supervisor_id"]: sup for sup in supervisors}

    for supervisor in supervisors:
        assigned_count = sum(
            1 for p in placements
            if p.get("supervisor_id") == supervisor["supervisor_id"]
        )
        supervisor["student_count"] = assigned_count

    # ----------------------------------------------------
    # LOGS
    # ----------------------------------------------------

    log_result = supabase.table("daily_log").select("*").order("log_date", desc=True).execute()
    logs = log_result.data

    for log in logs:
        student = student_by_id.get(log["student_id"])
        log["student_name"] = (
            f'{student["first_name"]} {student["last_name"]}'
            if student else "Unknown student"
        )

        placement = placement_by_student.get(log["student_id"])
        supervisor_for_log = (
            supervisor_by_id.get(placement["supervisor_id"])
            if placement and placement.get("supervisor_id")
            else None
        )
        log["supervisor_name"] = (
            f'{supervisor_for_log["first_name"]} {supervisor_for_log["last_name"]}'
            if supervisor_for_log else "Unassigned"
        )

    # ----------------------------------------------------
    # DASHBOARD STATS
    # ----------------------------------------------------

    today = date.today().isoformat()

    active_internships = sum(
        1 for p in placements
        if not p.get("end_date") or str(p.get("end_date")) >= today
    )

    completed_internships = sum(
        1 for p in placements
        if p.get("end_date") and str(p.get("end_date")) < today
    )

    pending_reviews = sum(
        1 for log in logs
        if log.get("supervisor_status") == "pending"
    )

    students_with_placement = set(placement_by_student.keys())
    pending_placements = sum(
        1 for s in students
        if s["student_id"] not in students_with_placement
    )

    dashboard_stats = {
        "totalStudents": len(students),
        "totalSupervisors": len(supervisors),
        "activeInternships": active_internships,
        "pendingReviews": pending_reviews,
        "activeStudents": len(students_with_placement),
        "pendingPlacements": pending_placements,
        "completedInternships": completed_internships,
    }

    return render_template(
        'admin.html',
        students=students,
        supervisors=supervisors,
        logs=logs,
        dashboard_stats=dashboard_stats
    )
    
@app.route("/student", methods=["GET"])
@role_required('student')
def student():
    student = get_current_student()

    if not student:
        return error("Student profile not found.", 404)

    user = get_current_user()

    internship = supabase.table("internship_placement").select().eq("student_id", student["student_id"]).execute()

    if not internship.data:
        internshipData = None
        companyData = None
        supervisorData = None
    else:
        internshipData = internship.data[0]

        company_id = internshipData.get("company_id")
        if company_id:
            company = supabase.table("company").select().eq("company_id", company_id).execute()
            companyData = company.data[0] if company.data else None
        else:
            companyData = None

        supervisor_id = internshipData.get("supervisor_id")
        if supervisor_id:
            supervisor_result = supabase.table("supervisor").select().eq("supervisor_id", supervisor_id).execute()
            supervisorData = supervisor_result.data[0] if supervisor_result.data else None
        else:
            supervisorData = None

    daily_log = supabase.table("daily_log").select().eq("student_id", student["student_id"]).execute()
    logs = daily_log.data

    # ----------------------------------------------------
    # STAT CARDS
    # ----------------------------------------------------

    submitted_logs_count = len(logs)

    approved_logs_count = sum(
        1 for log in logs if log.get("supervisor_status") == "approved"
    )

    pending_logs_count = sum(
        1 for log in logs if log.get("supervisor_status") == "pending"
    )

    internship_status = "Active" if internshipData else "Not Assigned"

    return render_template(
        'student.html',
        student=student,
        user=user,
        internshipData=internshipData,
        companyData=companyData,
        supervisorData=supervisorData,
        logs=logs,
        submitted_logs_count=submitted_logs_count,
        approved_logs_count=approved_logs_count,
        pending_logs_count=pending_logs_count,
        internship_status=internship_status
    )
    
@app.route("/passwordCreate", methods=["GET"])
def create():
    return render_template('createPassword.html')



@app.route("/supervisor", methods=["GET"])
@role_required("supervisor")
def supervisor():
    supervisor_id = get_current_supervisor()["supervisor_id"]
    #Get supervisor
    supervisor_data = supabase.table("supervisor").select().eq("supervisor_id", supervisor_id).execute()
    supervisor = supervisor_data.data[0]

    # Get supervisor's department
    department_data = supabase.table("supervisor").select("department").eq("supervisor_id", supervisor_id).execute()
    department = department_data.data[0]["department"]

    # Get all students in that department
    student_result = supabase.table("student").select().eq("department", department).execute()
    students = student_result.data
    student_ids = [s["student_id"] for s in students]

    # Fetch all pending logs for those students in a single query
    pending_logs_by_student = {sid: [] for sid in student_ids}
    if student_ids:
        daily_log_result = (
            supabase.table("daily_log")
            .select()
            .in_("student_id", student_ids)
            .eq("supervisor_status", "pending")
            .execute()
        )
        for log in daily_log_result.data:
            pending_logs_by_student[log["student_id"]].append(log)

    # ----------------------------------------------------
    # ATTACH COMPANY + STATUS TO EACH STUDENT
    # ----------------------------------------------------

    if student_ids:
        placement_result = (
            supabase.table("internship_placement")
            .select("*")
            .in_("student_id", student_ids)
            .execute()
        )
        placements = placement_result.data
    else:
        placements = []

    placement_by_student = {p["student_id"]: p for p in placements}

    company_ids = [
        p["company_id"] for p in placements if p.get("company_id")
    ]

    if company_ids:
        company_result = (
            supabase.table("company")
            .select("*")
            .in_("company_id", company_ids)
            .execute()
        )
        companies = company_result.data
    else:
        companies = []

    company_by_id = {c["company_id"]: c for c in companies}

    for student in students:
        placement = placement_by_student.get(student["student_id"])
        if placement:
            company = company_by_id.get(placement["company_id"])
            student["company"] = company["company_name"] if company else None
            student["status"] = "Active"
        else:
            student["company"] = None
            student["status"] = "Pending"

    # ----------------------------------------------------
    # APPROVED LOGS COUNT
    # ----------------------------------------------------

    approved_logs_count = 0
    if student_ids:
        approved_logs_result = (
            supabase.table("daily_log")
            .select("log_id")
            .in_("student_id", student_ids)
            .eq("supervisor_status", "approved")
            .execute()
        )
        approved_logs_count = len(approved_logs_result.data)

    # ----------------------------------------------------
    # ACTIVE STUDENTS COUNT (students with a placement under this supervisor)
    # ----------------------------------------------------

    active_students_count = 0
    if student_ids:
        placement_under_supervisor = (
            supabase.table("internship_placement")
            .select("student_id")
            .eq("supervisor_id", supervisor_id)
            .in_("student_id", student_ids)
            .execute()
        )
        active_students_count = len(placement_under_supervisor.data)

    return render_template(
        'supervisor.html',
        students=students,
        pending_logs_by_student=pending_logs_by_student,
        supervisor=supervisor,
        approved_logs_count=approved_logs_count,
        active_students_count=active_students_count
    )
# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return success(
        "API is healthy."
    )

# ============================================================
# ADMIN PAGE
# ============================================================


# ============================================================
# REGISTER STUDENT
# ============================================================

@app.route("/addStudent", methods=["POST"]) 
@role_required("admin")
def addStudent():

    try:

        data = request.get_json()
        #print(data)
        if not data:
            print("mistake")
            return error(
                "Request body must contain JSON data."
            )

        #username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        #password = data.get("password")

        student_id = str(data.get("student_id", "")).strip()
        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        department = str(data.get("department", "")).strip()
        #level = str(data.get("level", "")).strip()
        gender = str(data.get("gender", "")).strip()

        # ----------------------------------------------------
        # VALIDATION
        #  

        required_fields = {
            #"username": username,
            "email": email,
            #"password": password,
            "student_id": student_id,
            "first_name": first_name,
            "last_name": last_name,
            "department": department,
            #"level": level,
            "gender": gender
        }

        missing = [
            field
            for field, value in required_fields.items()
            if value is None or str(value).strip() == ""
        ]

        if missing:
            print("mistake missing")
            return error(
                "Some required fields are missing.",
                400,
                {"missing_fields": missing}
            )

        # ----------------------------------------------------
        # CHECK EMAIL
        # ----------------------------------------------------

        email_check = (
            supabase
            .table("users")
            .select("user_id")
            .eq("email", email)
            .execute()
        )

        if email_check.data:
            print("mistake email")
            return error(
                "Email already exists.",
                409
            )

        # ----------------------------------------------------
        # CHECK STUDENT ID
        # ----------------------------------------------------

        student_check = (
            supabase
            .table("student")
            .select("student_id")
            .eq("student_id", student_id)
            .execute()
        )

        if student_check.data:
            print("mistake student")
            return error(
                "Student ID already exists.",
                409
            )

        # ----------------------------------------------------
        # GENERATE ACTIVATION CODE
        # ----------------------------------------------------

        otp_code = generate_otp()

        # IMPORTANT:
        # Role is NOT accepted from the user.
        # Public registration always creates a student.
        user_data = {
            #"username": username,
            "email": email,
            #"password_hash": password_hash,
            "role": "student",
            "activation_code": otp_code
        }

        # ----------------------------------------------------
        # CREATE USER
        # ----------------------------------------------------

        user_result = (
            supabase
            .table("users")
            .insert(user_data)
            .execute()
        )

        if not user_result.data:
            return error(
                "Unable to create user account.",
                500
            )

        user_id = user_result.data[0]["user_id"]

        # ----------------------------------------------------
        # CREATE STUDENT PROFILE
        # ----------------------------------------------------

        student_data = {
            "student_id": student_id,
            "user_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "department": department,
            #"level": level,
            "gender": gender
        }

        student_result = (
            supabase
            .table("student")
            .insert(student_data)
            .execute()
        )

        if not student_result.data:

            # Best-effort rollback
            supabase \
                .table("users") \
                .delete() \
                .eq("user_id", user_id) \
                .execute()

            return error(
                "Student profile could not be created.",
                500
            )

        # ----------------------------------------------------
        # SEND ACTIVATION EMAIL
        # ----------------------------------------------------

        try:
            send_activation_email(email, otp_code)
        except Exception as email_error:
            print("Email send failed:", email_error)
            return success(
                "Registration successful, but the activation email failed to send. Please resend manually.",
                {
                    "user_id": user_id,
                    "student_id": student_id,
                    "role": "student"
                },
                201
            )

        return success(
            "Registration successful.",
            {
                "user_id": user_id,
                "student_id": student_id,
                "role": "student"
            },
            201
        )

    except Exception as e:
        print (e)

        return error(
            "An error occurred during registration.",
            500,
            e
        )
# ============================================================
# STUDENT CONFIRMATION
# ============================================================
@app.route("/create-password", methods=["POST"])
def create_password():

    try:

        data = request.get_json()

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        # ----------------------------------------------------
        # GET DATA
        # ----------------------------------------------------

        email = str(
            data.get("email", "")
        ).strip().lower()

        activation_code = str(
            data.get("activation_code", "")
        ).strip()

        password = data.get("password")
        confirm_password = data.get("confirm_password")

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        required_fields = {
            "email": email,
            "activation_code": activation_code,
            "password": password,
            "confirm_password": confirm_password
        }

        missing = [
            field
            for field, value in required_fields.items()
            if value is None or str(value).strip() == ""
        ]

        if missing:
            return error(
                "Some required fields are missing.",
                400,
                {"missing_fields": missing}
            )

        # ----------------------------------------------------
        # CHECK PASSWORD LENGTH
        # ----------------------------------------------------

        if len(password) < 8:
            return error(
                "Password must contain at least 8 characters.",
                400
            )

        # ----------------------------------------------------
        # CHECK PASSWORD MATCH
        # ----------------------------------------------------

        if password != confirm_password:
            return error(
                "Passwords do not match.",
                400
            )

        # ----------------------------------------------------
        # FIND USER
        # ----------------------------------------------------

        user_result = (
            supabase
            .table("users")
            .select("user_id, email, password_hash, activation_code")
            .eq("email", email)
            .execute()
        )

        if not user_result.data:
            return error(
                "User account not found.",
                404
            )

        user = user_result.data[0]

        # ----------------------------------------------------
        # CHECK IF PASSWORD ALREADY EXISTS
        # ----------------------------------------------------

        if user.get("password_hash"):
            return error(
                "A password has already been created for this account. Please log in.",
                409
            )

        # ----------------------------------------------------
        # VERIFY ACTIVATION CODE
        # ----------------------------------------------------

        if not user.get("activation_code") or user["activation_code"] != activation_code:
            return error(
                "Invalid activation code.",
                401
            )

        # ----------------------------------------------------
        # HASH PASSWORD
        # ----------------------------------------------------

        password_hash = generate_password_hash(password)

        # ----------------------------------------------------
        # UPDATE USER
        # ----------------------------------------------------

        update_result = (
            supabase
            .table("users")
            .update({
                "password_hash": password_hash,
                "activation_code": None
            })
            .eq("email", email)
            .execute()
        )

        if not update_result.data:
            return error(
                "Unable to create password.",
                500
            )

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return success(
            "Password created successfully. You can now log in.",
            {

                "email": email
            },
            200
        )

    except Exception as e:

        print(e)

        return error(
            "An error occurred while creating the password.",
            500,
            e
        )


# ============================================================
# LOGIN
# ============================================================

@app.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json()

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        email = str(
            data.get("email", "")
        ).strip()

        password = data.get("password")

        if not email or not password:
            return error(
                "Email and password are required."
            )

        # ----------------------------------------------------
        # FIND USER
        # ----------------------------------------------------

        result = (
            supabase
            .table("users")
            .select("*")
            .eq("email", email)
            .execute()
        )

        if not result.data:
            return error(
                "Invalid email or password.",
                401
            )

        user = result.data[0]

        # ----------------------------------------------------
        # VERIFY PASSWORD
        # ----------------------------------------------------

        if not check_password_hash(
            user.get("password_hash", ""),
            password
        ):
            return error(
                "Invalid username or password.",
                401
            )

        # ----------------------------------------------------
        # CREATE JWT
        # ----------------------------------------------------
        role = user.get("role")
        access_token = create_access_token(
            identity=str(user["user_id"]),
            additional_claims={
                "role": role,
            }
        )
        response = jsonify({"role":role})
        set_access_cookies(response, access_token)

        return response
        

    except Exception as e:
        print(e)

        return error(
            "An error occurred during login.",
            500,
            e
        )


# ============================================================
# GET CURRENT USER
# ============================================================

@app.route("/me", methods=["GET"])
@jwt_required()
def me():

    try:

        user = get_current_user()

        if not user:
            return error(
                "User account not found.",
                404
            )

        return success(
            "User retrieved successfully.",
            user
        )

    except Exception as e:

        return error(
            "Unable to retrieve user.",
            500,
            e
        )


# ============================================================
# STUDENT PROFILE
# ============================================================

"""@app.route("/student/profile", methods=["GET"])
@role_required("student")
def student_profile():

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        return success(
            "Student profile retrieved successfully.",
            student
        )

    except Exception as e:

        return error(
            "Unable to retrieve student profile.",
            500,
            e
        )"""


# ============================================================
# UPDATE STUDENT PROFILE
# ============================================================

@app.route("/student/profile", methods=["PUT"])
@role_required("student")
def update_student_profile():

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        data = request.get_json()

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        phone = data.get('phone')
        address = data.get('address')
        update_data ={"phone": phone, "address":address}

        if not phone or  not address:
            return error( "Fields were not properly filled",
                         402,
                         e
            )

        result = (
            supabase
            .table("student")
            .update(update_data)
            .eq("student_id", student["student_id"])
            .execute()
        )

        return success(
            "Student profile updated successfully.",
            result.data[0] if result.data else None
        )

    except Exception as e:
        print(e)

        return error(
            "Unable to update student profile.",
            500,
            e
        )


# ============================================================
# CREATE DAILY LOG
# ============================================================

@app.route("/student/logs", methods=["POST"])
@role_required("student")
def create_log():

    try:

        student = get_current_student()["student_id"]

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        data = request.get_json()

        if not data:
            return error(
                "Request body must contain JSON data."
            )
        id = data.get("id")
        log_date = data.get("date")
        activity_description = str(
            data.get("activity", "")
        ).strip()
        skills = data.get("skills")
        challenges = data.get("challenges")
        status = data.get("status")

        if not log_date or not activity_description:
            return error(
                "log_date and activity_description are required."
            )

        # ----------------------------------------------------
        # VALIDATE DATE
        # ----------------------------------------------------

        parsed_date = validate_date(str(log_date))

        if not parsed_date:
            return error(
                "Invalid log_date. Use ISO date format."
            )

        # ----------------------------------------------------
        # CHECK INTERNSHIP PLACEMENT
        # ----------------------------------------------------

        placement_result = (
            supabase
            .table("internship_placement")
            .select("*")
            .eq("student_id", student)
            .execute()
        )

        if not placement_result.data:
            return error(
                "You do not have an active internship placement.",
                400
            )

        placement = placement_result.data[0]

        start_date = placement.get("start_date")
        end_date = placement.get("end_date")

        if start_date and str(parsed_date.date()) < str(start_date):
            return error(
                "The log date is before your internship start date."
            )

        if end_date and str(parsed_date.date()) > str(end_date):
            return error(
                "The log date is after your internship end date."
            )

        # ----------------------------------------------------
        # PREVENT DUPLICATE DAILY LOG
        # ----------------------------------------------------

        duplicate_check = (
            supabase
            .table("daily_log")
            .select("log_id")
            .eq("student_id", student)
            .eq("log_date", log_date)
            .execute()
        )

        if duplicate_check.data:
            return error(
                "A daily log already exists for this date.",
                409
            )

        # ----------------------------------------------------
        # CREATE LOG
        # ----------------------------------------------------

        log_data = {
            "log_id":id,
            "student_id": student,
            "log_date": log_date,
            "activity_description": activity_description,
            "supervisor_status": "pending",
            "skills_learned": skills,
            "challenges": challenges
        }

        result = (
            supabase
            .table("daily_log")
            .insert(log_data)
            .execute()
        )

        if not result.data:
            return error(
                "Daily log could not be created.",
                500
            )

        return success(
            "Daily log created successfully.",
            result.data[0],
            201
        )

    except Exception as e:
        print(e)

        return error(
            "An error occurred while creating the daily log.",
            500,
            e
        )


# ============================================================
# GET STUDENT LOGS
# ============================================================

@app.route("/student/logs", methods=["GET"])
@role_required("student")
def get_student_logs():

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 20, type=int)

        page = max(page, 1)
        limit = min(max(limit, 1), 100)

        start = (page - 1) * limit
        end = start + limit - 1

        result = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("student_id", student["student_id"])
            .order("log_date", desc=True)
            .range(start, end)
            .execute()
        )

        return success(
            "Student logs retrieved successfully.",
            {
                "page": page,
                "limit": limit,
                "logs": result.data
            }
        )

    except Exception as e:

        return error(
            "Unable to retrieve student logs.",
            500,
            e
        )


# ============================================================
# GET ONE STUDENT LOG
# ============================================================

@app.route("/student/logs/<int:log_id>", methods=["GET"])
@role_required("student")
def get_student_log(log_id):

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        result = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("log_id", log_id)
            .eq("student_id", student["student_id"])
            .execute()
        )

        if not result.data:
            return error(
                "Log not found.",
                404
            )

        return success(
            "Log retrieved successfully.",
            result.data[0]
        )

    except Exception as e:

        return error(
            "Unable to retrieve log.",
            500,
            e
        )


# ============================================================
# UPDATE STUDENT LOG
# ============================================================

@app.route("/student/logs/<int:log_id>", methods=["PUT"])
@role_required("student")
def update_student_log(log_id):

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        # ----------------------------------------------------
        # FIND LOG
        # ----------------------------------------------------

        log_result = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("log_id", log_id)
            .eq("student_id", student["student_id"])
            .execute()
        )

        if not log_result.data:
            return error(
                "Log not found.",
                404
            )

        log = log_result.data[0]

        # ----------------------------------------------------
        # APPROVED LOGS CANNOT BE EDITED
        # ----------------------------------------------------

        if log.get("supervisor_status") == "approved":
            return error(
                "Approved logs cannot be edited."
            )

        data = request.get_json()

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        update_data = {}

        if "activity_description" in data:

            activity = str(
                data["activity_description"]
            ).strip()

            if not activity:
                return error(
                    "Activity description cannot be empty."
                )

            update_data["activity_description"] = activity

        if "log_date" in data:

            new_date = data["log_date"]

            if not validate_date(str(new_date)):
                return error(
                    "Invalid log_date."
                )

            update_data["log_date"] = new_date

        if not update_data:
            return error(
                "No valid fields were provided."
            )

        # If student edits rejected log, send it back for review.
        update_data["supervisor_status"] = "pending"

        result = (
            supabase
            .table("daily_log")
            .update(update_data)
            .eq("log_id", log_id)
            .eq("student_id", student["student_id"])
            .execute()
        )

        return success(
            "Log updated successfully.",
            result.data[0] if result.data else None
        )

    except Exception as e:

        return error(
            "Unable to update log.",
            500,
            e
        )


# ============================================================
# DELETE STUDENT LOG
# ============================================================

@app.route("/student/logs/<int:log_id>", methods=["DELETE"])
@role_required("student")
def delete_student_log(log_id):

    try:

        student = get_current_student()

        if not student:
            return error(
                "Student profile not found.",
                404
            )

        log_result = (
            supabase
            .table("daily_log")
            .select("supervisor_status")
            .eq("log_id", log_id)
            .eq("student_id", student["student_id"])
            .execute()
        )

        if not log_result.data:
            return error(
                "Log not found.",
                404
            )

        status = log_result.data[0].get(
            "supervisor_status"
        )

        if status == "approved":
            return error(
                "Approved logs cannot be deleted."
            )

        (
            supabase
            .table("daily_log")
            .delete()
            .eq("log_id", log_id)
            .eq("student_id", student["student_id"])
            .execute()
        )

        return success(
            "Log deleted successfully."
        )

    except Exception as e:

        return error(
            "Unable to delete log.",
            500,
            e
        )

# ============================================================
# STUDENT- CREATE INTERNSHIP PLACEMENT
# ============================================================

@app.route("/student/placements", methods=["POST"])
@role_required("student")
def create_placement():
    try:

        data = request.get_json()
        print(data)

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        student_id = get_current_student()["student_id"]
        companyAddress = data.get("companyAddress")
        companyPhoneNo = data.get("companyPhoneNo")
        companyName = data.get("company")
        companyEmail = data.get("companyEmail")
        start_date = data.get("startDate")
        end_date = data.get("endDate")

        if not student_id or not start_date:

            return error(
                "student_id, company_id and start_date are required."
            )

        # ----------------------------------------------------
        # AUTO-ASSIGN SUPERVISOR BASED ON STUDENT'S DEPARTMENT
        # ----------------------------------------------------

        student_data_result = (
            supabase
            .table("student")
            .select("department")
            .eq("student_id", student_id)
            .execute()
        )

        student_department = student_data_result.data[0]["department"]

        supervisor_lookup = (
            supabase
            .table("supervisor")
            .select("supervisor_id")
            .eq("department", student_department)
            .execute()
        )

        supervisor_id = (
            supervisor_lookup.data[0]["supervisor_id"]
            if supervisor_lookup.data
            else None
        )

        # ----------------------------------------------------
        # CHECK DATE
        # ----------------------------------------------------

        start = validate_date(str(start_date))

        if not start:
            return error(
                "Invalid start_date."
            )

        if end_date:

            end = validate_date(str(end_date))

            if not end:
                return error(
                    "Invalid end_date."
                )

            if end.date() < start.date():
                return error(
                    "end_date cannot be before start_date."
                )

        # ----------------------------------------------------
        # CREATE PLACEMENT
        # ----------------------------------------------------

        company_data = {
            "company_name": companyName,
            "address": companyAddress,
            "phone_number": companyPhoneNo,
            "contact_email": companyEmail
        }

        companyResult = (
            supabase
            .table("company")
            .insert(company_data)
            .execute()
        )

        placement_data = {
            "student_id": student_id,
            "company_id": companyResult.data[0]["company_id"],
            "supervisor_id": supervisor_id,
            "start_date": start_date,
            "end_date": end_date
        }

        result = (
            supabase
            .table("internship_placement")
            .insert(placement_data)
            .execute()
        )

        return success(
            "Internship placement created successfully.",
            result.data[0] if result.data else None,
            201
        )

    except Exception as e:
        print(e)

        return error(
            "Unable to create internship placement.",
            500,
            e
        )
# ============================================================
# SUPERVISOR PROFILE
# ============================================================

@app.route("/supervisor/profile", methods=["GET"])
@role_required("supervisor")
def supervisor_profile():

    try:

        supervisor = get_current_supervisor()

        if not supervisor:
            return error(
                "Supervisor profile not found.",
                404
            )

        return success(
            "Supervisor profile retrieved successfully.",
            supervisor
        )

    except Exception as e:

        return error(
            "Unable to retrieve supervisor profile.",
            500,
            e
        )


# ============================================================
# SUPERVISOR - GET ASSIGNED STUDENTS
# ============================================================

@app.route("/supervisor/students", methods=["GET"])
@role_required("supervisor")
def supervisor_students():

    try:

        supervisor = get_current_supervisor()

        if not supervisor:
            return error(
                "Supervisor profile not found.",
                404
            )

        supervisor_id = supervisor["supervisor_id"]

        placements = (
            supabase
            .table("internship_placement")
            .select("*")
            .eq("supervisor_id", supervisor_id)
            .execute()
        )

        students = []

        for placement in placements.data:

            student_id = placement["student_id"]

            student_result = (
                supabase
                .table("student")
                .select("*")
                .eq("student_id", student_id)
                .execute()
            )

            if student_result.data:

                students.append({
                    "student": student_result.data[0],
                    "placement": placement
                })

        return success(
            "Assigned students retrieved successfully.",
            students
        )

    except Exception as e:

        return error(
            "Unable to retrieve assigned students.",
            500,
            e
        )


# ============================================================
# SUPERVISOR - GET STUDENT LOGS
# ============================================================

@app.route("/supervisor/students/<student_id>/logs", methods=["GET"])
@role_required("supervisor")
def supervisor_student_logs(student_id):

    try:

        supervisor = get_current_supervisor()

        if not supervisor:
            return error(
                "Supervisor profile not found.",
                404
            )

        supervisor_id = supervisor["supervisor_id"]

        # ----------------------------------------------------
        # VERIFY STUDENT IS ASSIGNED TO SUPERVISOR
        # ----------------------------------------------------

        placement = (
            supabase
            .table("internship_placement")
            .select("*")
            .eq("student_id", student_id)
            .eq("supervisor_id", supervisor_id)
            .execute()
        )

        if not placement.data:
            return error(
                "This student is not assigned to you.",
                403
            )

        # ----------------------------------------------------
        # GET LOGS
        # ----------------------------------------------------

        logs = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("student_id", student_id)
            .order("log_date", desc=True)
            .execute()
        )

        return success(
            "Student logs retrieved successfully.",
            logs.data
        )

    except Exception as e:

        return error(
            "Unable to retrieve student logs.",
            500,
            e
        )


# ============================================================
# SUPERVISOR - APPROVE LOG
# ============================================================

@app.route("/supervisor/logs/<int:log_id>/approve", methods=["POST", "PATCH"])
@role_required("supervisor")
def approve_log(log_id):

    try:

        supervisor = get_current_supervisor()

        if not supervisor:
            return error("Supervisor profile not found.", 404)

        supervisor_id = supervisor["supervisor_id"]

        log_result = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("log_id", log_id)
            .execute()
        )

        if not log_result.data:
            return error("Log not found.", 404)

        log = log_result.data[0]

        placement = (
            supabase
            .table("internship_placement")
            .select("placement_id")
            .eq("student_id", log["student_id"])
            .eq("supervisor_id", supervisor_id)
            .execute()
        )

        if not placement.data:
            return error("You are not assigned to this student.", 403)

        supabase.table("daily_log").update({
            "supervisor_status": "approved"
        }).eq("log_id", log_id).execute()

        return success("Log approved successfully.")

    except Exception as e:
        print(e)
        return error("Unable to approve log.", 500, e)


# ============================================================
# SUPERVISOR - REJECT LOG
# ============================================================

@app.route("/supervisor/logs/<int:log_id>/reject", methods=["POST", "PATCH"])
@role_required("supervisor")
def reject_log(log_id):

    try:

        supervisor = get_current_supervisor()

        if not supervisor:
            return error("Supervisor profile not found.", 404)

        supervisor_id = supervisor["supervisor_id"]

        log_result = (
            supabase
            .table("daily_log")
            .select("*")
            .eq("log_id", log_id)
            .execute()
        )

        if not log_result.data:
            return error("Log not found.", 404)

        log = log_result.data[0]

        placement = (
            supabase
            .table("internship_placement")
            .select("placement_id")
            .eq("student_id", log["student_id"])
            .eq("supervisor_id", supervisor_id)
            .execute()
        )

        if not placement.data:
            return error("You are not assigned to this student.", 403)

        supabase.table("daily_log").update({
            "supervisor_status": "rejected"
        }).eq("log_id", log_id).execute()

        return success("Log rejected successfully.")

    except Exception as e:
        print(e)
        return error("Unable to reject log.", 500, e)
# ============================================================
# ADMIN - GET USERS
# ============================================================

@app.route("/admin/users", methods=["GET"])
@role_required("admin")
def admin_users():

    try:

        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 20, type=int)

        page = max(page, 1)
        limit = min(max(limit, 1), 100)

        start = (page - 1) * limit
        end = start + limit - 1

        result = (
            supabase
            .table("users")
            .select(
                "user_id, username, email, role, created_at"
            )
            .order("created_at", desc=True)
            .range(start, end)
            .execute()
        )

        return success(
            "Users retrieved successfully.",
            {
                "page": page,
                "limit": limit,
                "users": result.data
            }
        )

    except Exception as e:

        return error(
            "Unable to retrieve users.",
            500,
            e
        )


# ============================================================
# ADMIN - CREATE SUPERVISOR
# ============================================================

@app.route("/admin/supervisors", methods=["POST"])
@role_required("admin")
def create_supervisor():

    try:

        data = request.get_json()
        print(data)

        if not data:
            return error(
                "Request body must contain JSON data."
            )

        #username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        #password = data.get("password")

        first_name = str(
            data.get("first_name", "")
        ).strip()

        last_name = str(
            data.get("last_name", "")
        ).strip()

        department = str(
            data.get("department", "")
        ).strip()

        required = {
            #"username": username,
            "email": email,
            #"password": password,
            "first_name": first_name,
            "last_name": last_name,
            "department": department
        }

        missing = [
            key for key, value in required.items()
            if value is None or str(value).strip() == ""
        ]

        if missing:
            return error(
                "Required fields are missing.",
                400,
                {"missing_fields": missing}
            )

        """if len(password) < 8:
            return error(
                "Password must contain at least 8 characters."
            )"""

        # Check username/email
        existing = (
            supabase
            .table("users")
            .select("user_id")
            .eq("email", email)
            .execute()
        )

        if existing.data:
            return error(
                "email already exists.",
                409
            )

        # Create user
        user_result = (
            supabase
            .table("users")
            .insert({
                #"username": username,
                "email": email,
                #"password_hash": generate_password_hash(password),
                "role": "supervisor"
            })
            .execute()
        )

        if not user_result.data:
            return error(
                "Unable to create supervisor account.",
                500
            )

        user_id = user_result.data[0]["user_id"]

        # Create supervisor
        supervisor_result = (
            supabase
            .table("supervisor")
            .insert({
                "user_id": user_id,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "department": department
            })
            .execute()
        )

        if not supervisor_result.data:

            supabase \
                .table("users") \
                .delete() \
                .eq("user_id", user_id) \
                .execute()

            return error(
                "Supervisor profile could not be created.",
                500
            )

        return success(
            "Supervisor created successfully.",
            {
                "user_id": user_id,
                "supervisor_id": supervisor_result.data[0]["supervisor_id"]
            },
            201
        )

    except Exception as e:
        print(e)

        return error(
            "Unable to create supervisor.",
            500,
            e
        )


# ============================================================
# ADMIN - DELETE USER
# ============================================================

@app.route("/admin/users/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def admin_remove_user(user_id):

    try:

        user_result = (
            supabase
            .table("users")
            .select("user_id, role, username")
            .eq("user_id", user_id)
            .execute()
        )

        if not user_result.data:
            return error(
                "User does not exist.",
                404
            )

        user = user_result.data[0]
        role = user["role"]

        # ----------------------------------------------------
        # PREVENT ADMIN ACCOUNT DELETION
        # ----------------------------------------------------

        if role == "admin":
            return error(
                "Admin accounts cannot be deleted.",
                403
            )

        # ----------------------------------------------------
        # STUDENT
        # ----------------------------------------------------

        if role == "student":

            student_result = (
                supabase
                .table("student")
                .select("student_id")
                .eq("user_id", user_id)
                .execute()
            )

            if student_result.data:

                student_id = student_result.data[0]["student_id"]

                # Delete logs
                (
                    supabase
                    .table("daily_log")
                    .delete()
                    .eq("student_id", student_id)
                    .execute()
                )

                # Delete placement
                (
                    supabase
                    .table("internship_placement")
                    .delete()
                    .eq("student_id", student_id)
                    .execute()
                )

                # Delete student profile
                (
                    supabase
                    .table("student")
                    .delete()
                    .eq("student_id", student_id)
                    .execute()
                )

        # ----------------------------------------------------
        # SUPERVISOR
        # ----------------------------------------------------

        elif role == "supervisor":

            supervisor_result = (
                supabase
                .table("supervisor")
                .select("supervisor_id")
                .eq("user_id", user_id)
                .execute()
            )

            if supervisor_result.data:

                supervisor_id = supervisor_result.data[0][
                    "supervisor_id"
                ]

                # Remove supervisor from placements
                (
                    supabase
                    .table("internship_placement")
                    .update({
                        "supervisor_id": None
                    })
                    .eq("supervisor_id", supervisor_id)
                    .execute()
                )

                # Delete supervisor profile
                (
                    supabase
                    .table("supervisor")
                    .delete()
                    .eq("supervisor_id", supervisor_id)
                    .execute()
                )

        # ----------------------------------------------------
        # DELETE USER
        # ----------------------------------------------------

        (
            supabase
            .table("users")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

        return success(
            f"{role.capitalize()} account removed successfully."
        )

    except Exception as e:

        return error(
            "Unable to remove user.",
            500,
            e
        )

# ============================================================
# GET COMPANIES
# ============================================================

@app.route("/companies", methods=["GET"])
@jwt_required()
def get_companies():

    try:

        result = (
            supabase
            .table("company")
            .select("*")
            .order("company_name")
            .execute()
        )

        return success(
            "Companies retrieved successfully.",
            result.data
        )

    except Exception as e:

        return error(
            "Unable to retrieve companies.",
            500,
            e
        )

@app.route("/logout", methods=["GET"])
@jwt_required()
def logout():
    try:
        response = redirect(url_for("index"))
        unset_jwt_cookies(response)
        return response
    except Exception as e:
        print(e)
        return error("Unable to log out.", 500, e)






# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )