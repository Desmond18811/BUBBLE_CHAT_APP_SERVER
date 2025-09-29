import mongoose from "mongoose";
import {genSalt, hash} from "bcrypt";

const userSchema = new mongoose.Schema({
    email: {
        type:String,
        required: [true, "Email is required"],
        unique:true,
    },
    password: {
        type:String,
        required: [true, "Password is required"],
        minLength:5,
    },
    firstName: {
        type:String,
        required: false
    },
    lastName: {
        type:String,
        required: false
    },
    Image: {
        type:String,
        required: false
    },
    Color: {
        type: Number,
        required: false
    },
    profileSetup: {
        type: Boolean,
        default: false
    },
    googleId: String,
})

userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
const User = mongoose.model("User", userSchema);

export default User;