"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface BookingNameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (bookingName: string) => void
}

export default function BookingNameModal({ isOpen, onClose, onConfirm }: BookingNameModalProps) {
  const [bookingName, setBookingName] = useState("")

  const handleConfirm = () => {
    if (bookingName.trim()) {
      onConfirm(bookingName)
      setBookingName("") // Reset the input after confirmation
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="bg-white p-0 rounded-xl overflow-hidden w-[90%] max-w-md border-0">
        <DialogHeader className="p-4 bg-gray-100 border-b border-gray-200">
          <DialogTitle className="text-center text-gray-800 font-medium">Booking Name</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <Input
            placeholder="Ex. Meeting 1"
            value={bookingName}
            onChange={(e) => setBookingName(e.target.value)}
            className="border-gray-300 mb-6"
            autoFocus
          />
          <Button
            onClick={handleConfirm}
            className="w-full bg-[#5A0D16] hover:bg-[#4A0B12] text-white py-5 shadow-md transition-all hover:shadow-lg"
          >
            CONFIRM
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
