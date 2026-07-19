from sqlalchemy import Integer, ForeignKey, DateTime, Text, func, Boolean, String, UniqueConstraint
from sqlalchemy.orm import foreign
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="room")
    messages: Mapped[list["RoomMessage"]] = relationship("RoomMessage", back_populates="room", cascade="all, delete-orphan")

class RoomMessage(Base):
    __tablename__ = "room_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    edited_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="messages")
    user: Mapped["User"] = relationship("User")
    reactions: Mapped[list["MessageReaction"]] = relationship(
        "MessageReaction",
        primaryjoin="and_(MessageReaction.target_type=='room_message', foreign(MessageReaction.target_id)==RoomMessage.id)",
        cascade="all, delete-orphan",
        viewonly=True,
    )

class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id], back_populates="messages_received")

class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    mentor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="announcements")
    mentor: Mapped["User"] = relationship("User", foreign_keys=[mentor_id])
    reads: Mapped[list["AnnouncementRead"]] = relationship("AnnouncementRead", back_populates="announcement", cascade="all, delete-orphan")

class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    announcement_id: Mapped[int] = mapped_column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    read_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    announcement: Mapped["Announcement"] = relationship("Announcement", back_populates="reads")
    user: Mapped["User"] = relationship("User")

class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'room_message' | 'daily_report'
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("target_type", "target_id", "user_id", "emoji", name="uq_message_reaction_target_user_emoji"),
    )

    user: Mapped["User"] = relationship("User")

class ProjectApprovalMessage(Base):
    __tablename__ = "project_approval_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="approval_messages")
    user: Mapped["User"] = relationship("User", back_populates="approval_messages")
